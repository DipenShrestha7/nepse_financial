# routes.py (FastAPI)
from fastapi import APIRouter
from chatbot.query_parser import parse_question
from chatbot.database_session import get_metrics
from chatbot.response_formatter import format_summary
from chatbot.llm_client import call_llm
from chatbot.memory_session import store_history

router = APIRouter()

@router.post("/chat/ask")
async def ask(payload: dict):
    question = payload["question"]
    user_id = payload.get("user_id")
    parsed = parse_question(question)

    company_ids = parsed.get("company_ids") or ([parsed["company_id"]] if parsed.get("company_id") is not None else None)
    company_symbols = parsed.get("company_symbols") or ([parsed.get("company_symbol") or parsed.get("symbol")] if parsed.get("company_symbol") or parsed.get("symbol") else None)
    company_names = parsed.get("company_names") or ([parsed.get("company_name") or parsed.get("company")] if parsed.get("company_name") or parsed.get("company") else None)

    rows = get_metrics(
        quarters=parsed.get("quarters"),
        metric_ids=parsed.get("metric_ids"),
        company_id=parsed.get("company_id"),
        company_symbol=parsed.get("company_symbol") or parsed.get("symbol"),
        company_name=parsed.get("company_name") or parsed.get("company"),
        company_ids=company_ids,
        company_symbols=company_symbols,
        company_names=company_names,
    )
    summary = format_summary(rows, parsed)
    answer = call_llm(question, summary)
    store_history(user_id, question, answer)  # POST to Node.js
    return {"answer": answer, "summary": summary}