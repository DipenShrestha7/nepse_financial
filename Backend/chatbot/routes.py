# routes.py (FastAPI)
from typing import cast

from fastapi import APIRouter
import logging
from chatbot.query_parser import parse_question, get_company_suggestions
from chatbot.database_session import get_metrics
from chatbot.response_formatter import format_summary
from chatbot.llm_client import call_llm

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/chat")
async def ask(payload: dict):
    question = payload["question"]
    parsed = parse_question(question)
    session_id = payload.get("session_id")
    history = payload.get("history")

    # Node backend already sends session history; normalize it for prompt context.
    normalized_history = []
    if isinstance(history, list):
        for item in history:
            if not isinstance(item, dict):
                continue

            role = (item.get("role") or "").strip().lower()
            content = item.get("content")
            if not isinstance(content, str) or not content.strip():
                continue

            if role == "ai":
                role = "assistant"
            elif role not in ("user", "assistant"):
                role = "user"

            normalized_history.append({"role": role, "content": content.strip()})

    # Check if we found any companies
    companies = parsed.get("companies") or []
    
    if not companies:
        # No companies found - provide helpful suggestions
        # Extract first few words from question as search term
        tokens = question.split()
        search_term = " ".join(tokens[:3]) if tokens else ""
        
        suggestions = get_company_suggestions(search_term) if search_term else []
        
        error_msg = "I couldn't identify a NEPSE company in your question."
        if suggestions:
            company_list = ", ".join([f"{s['symbol']} ({s['name']})" for s in suggestions[:5]])
            error_msg += f" Did you mean one of these? {company_list}"
        
        return {
            "answer": error_msg,
            "error": True,
            "suggestions": suggestions,
            "parsed": parsed,
        }

    company_ids = parsed.get("company_ids") or ([parsed["company_id"]] if parsed.get("company_id") is not None else None)
    company_symbols = parsed.get("company_symbols") or ([parsed.get("company_symbol") or parsed.get("symbol")] if parsed.get("company_symbol") or parsed.get("symbol") else None)
    company_names = parsed.get("company_names") or ([parsed.get("company_name") or parsed.get("company")] if parsed.get("company_name") or parsed.get("company") else None)

    company_symbols_clean = cast(list[str], company_symbols if company_symbols is not None else []) 

    company_names_clean = cast(list[str], company_names if company_names is not None else [])

    try:
        rows = get_metrics(
            quarters=parsed.get("quarters"),
            metric_ids=parsed.get("metric_ids"),
            company_id=parsed.get("company_id"),
            company_symbol=parsed.get("company_symbol") or parsed.get("symbol"),
            company_name=parsed.get("company_name") or parsed.get("company"),
            company_ids=company_ids,
            company_symbols=company_symbols_clean,
            company_names=company_names_clean,
        )
    except ValueError as exc:
        # Handle database errors gracefully
        return {
            "answer": f"I encountered an issue: {str(exc)}",
            "error": True,
            "parsed": parsed,
        }
    
    # Handle case where query returned no rows
    if not rows:
        company_names = parsed.get("company_names", [])
        quarters = parsed.get("quarters", [])
        metrics = parsed.get("metric_names", [])
        
        msg = f"I found the company ({company_names[0] if company_names else 'selected'}) but "
        if quarters and metrics:
            msg += f"there's no data for {metrics[0]} in {quarters[0]}."
        elif metrics:
            msg += f"there's no data for {metrics[0]}."
        elif quarters:
            msg += f"there's no data for the quarter {quarters[0]}."
        else:
            msg += "there's no data available."
        
        return {
            "answer": msg,
            "error": True,
            "parsed": parsed,
        }

    # If user explicitly requested a metric and a quarter/fiscal-year, try
    # to locate a single DB row to return a concise lookup answer (skip LLM).
    metric_names = parsed.get("metric_names")
    quarters = parsed.get("quarters") or []
    if metric_names and quarters:
        metric_tok = metric_names[0].lower()
        # separate explicit quarters (contain 'Q') from fiscal-year tokens
        explicit_q = [q.upper() for q in quarters if "Q" in q.upper()]
        fiscal_years = [q for q in quarters if "Q" not in q.upper()]

        # search function to match metric token against row metric name
        def metric_matches(r):
            rmetric = (r.get("metric_name") or "").lower()
            return metric_tok in rmetric or rmetric in metric_tok

        # 1) If explicit quarter provided, try exact match
        if explicit_q:
            for r in rows:
                if metric_matches(r) and r.get("quarter") in explicit_q:
                    metric = r.get("metric_name") or "Metric"
                    company = r.get("company_name") or r.get("company_symbol") or "Company"
                    quarter = r.get("quarter") or "Unknown quarter"
                    raw_value = r.get("value") or r.get("raw_value")
                    answer = f"{metric} value of {company} in {quarter} is '{raw_value}'"
                    summary = format_summary([r], parsed)
                    return {"answer": answer, "summary": summary}

        # 2) If fiscal-year token provided (e.g., '080-081'), pick latest quarter within that year
        if fiscal_years:
            fy_tok = fiscal_years[0]
            candidates = [r for r in rows if metric_matches(r) and (r.get("quarter") or "").startswith(fy_tok)]
            if candidates:
                # pick the latest quarter by string ordering
                best = sorted(candidates, key=lambda x: x.get("quarter") or "")[-1]
                metric = best.get("metric_name") or "Metric"
                company = best.get("company_name") or best.get("company_symbol") or "Company"
                quarter = best.get("quarter") or "Unknown quarter"
                raw_value = best.get("value") or best.get("raw_value")
                answer = f"{metric} value of {company} in {quarter} is '{raw_value}'"
                summary = format_summary([best], parsed)
                return {"answer": answer, "summary": summary}
    
    # If the user explicitly requested a metric (e.g., "EPS"), filter the
    # raw rows to that metric so the summary and LLM step operate on a
    # targeted dataset. This allows single-metric lookups to produce
    # deterministic, concise answers instead of full comparisons.
    metric_names = parsed.get("metric_names")
    filtered_rows = rows
    if metric_names:
        metric_set = {m.lower() for m in metric_names}
        # exact matches first
        filtered = [r for r in rows if (r.get("metric_name") or "").lower() in metric_set]
        # if no exact match, try substring/fuzzy matches (e.g., 'eps' -> 'eps ttm')
        if not filtered:
            alt = []
            for r in rows:
                rname = (r.get("metric_name") or "").lower()
                for m in metric_set:
                    if m in rname or rname in m:
                        alt.append(r)
                        break
            filtered = alt
        if filtered:
            filtered_rows = filtered

    # Use last few messages from the current session only.
    if session_id and normalized_history:
        recent = normalized_history[-4:]
        memory_text = "\n".join([f"{m['role']}: {m['content']}" for m in recent])
        question_with_memory = f"Conversation history:\n{memory_text}\n\nUser: {question}"
    else:
        question_with_memory = question

    summary = format_summary(filtered_rows, parsed)
    answer = call_llm(question_with_memory, summary)

    response = {"answer": answer, "summary": summary}
    
    # Add suggestions if we used fuzzy matches
    if parsed.get("metadata", {}).get("has_fuzzy_matches"):
        response["suggestions"] = parsed.get("suggestions", {})
    
    return response