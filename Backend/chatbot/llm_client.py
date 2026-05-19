# llm_client.py
import json
import google.generativeai as genai
try:
    from .config import settings
except ImportError:
    from config import settings

genai.configure(api_key=settings.GOOGLE_API_KEY)


def _sanitize_answer(text: str) -> str:
    if not text:
        return text

    lines = [line.rstrip() for line in text.splitlines()]
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("|") and stripped.endswith("|"):
            continue
        if stripped.upper() in {"COMPARISON TABLE", "DETAILED ANALYSIS", "KEY FINDINGS", "CONCLUSION"}:
            continue
        if stripped[:2].isdigit() and ". " in stripped[:4]:
            continue
        cleaned.append(stripped)

    if not cleaned:
        return text.strip()

    # Prefer the first concise paragraph if the model over-explains.
    joined = " ".join(cleaned)
    return joined[:500].strip()


def call_llm(question: str, json_summary: dict) -> str:
    # If the structured summary contains exactly one row, treat this as a
    # deterministic lookup and return a concise factual answer instead of
    # invoking the LLM. This avoids forcing single-value questions into the
    # comparison-style analysis prompt.
    rows = json_summary.get("rows") or []
    if len(rows) == 1:
        row = rows[0]
        metric = row.get("metric_name") or "Metric"
        company = row.get("company_name") or row.get("company_symbol") or "Company"
        quarter = row.get("quarter") or "Unknown quarter"
        raw_value = row.get("raw_value")
        value_display = raw_value if raw_value is not None else row.get("value")
        return f"{metric} value of {company} in {quarter} is '{value_display}'"

    llm_payload = {
        "query": json_summary.get("query"),
        "companies": json_summary.get("companies", {}),
        "comparison": json_summary.get("comparison", {}),
    }

    prompt = (
        "You are a NEPSE data assistant. Answer the user's question directly and briefly.\n"
        "Use only the structured JSON data below.\n"
        "Return only the final answer. Do not add analysis, background explanation, comparisons, tables, bullet points, headings, or conclusions unless the user explicitly asks for them.\n"
        "If the answer is a number or a short fact, give just that fact in one short sentence.\n"
        "If the question asks for a comparison, give a short comparison in 1-2 sentences, not a table.\n"
        "If the data is incomplete, say that briefly.\n\n"
        f"User question: {question}\n\n"
        f"Structured data: {json.dumps(llm_payload, ensure_ascii=False, indent=2)}\n"
    )

    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=settings.LLM_TEMPERATURE,
            max_output_tokens=2000,
        ),
    )

    return _sanitize_answer(response.text)

