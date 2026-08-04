import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import SecretStr

try:
    from .config import settings
except ImportError:
    import importlib

    settings = importlib.import_module("config").settings

# Initialize LangChain's ChatOpenAI client configured for OpenRouter
llm = ChatOpenAI(
    model=settings.OPENROUTER_MODEL,
    api_key=(SecretStr(settings.OPENROUTER_API_KEY)),
    base_url=settings.OPENROUTER_BASE_URL,
    temperature=settings.LLM_TEMPERATURE,
    max_completion_tokens=2000,
)


def _sanitize_answer(text: str) -> str:
    """Removes empty lines and strips excess whitespace while retaining Markdown formatting."""
    if not text:
        return ""
    cleaned_lines = []
    previous_was_blank = False

    for line in text.splitlines():
        stripped = line.rstrip()

        if stripped:
            cleaned_lines.append(stripped)
            previous_was_blank = False
            continue

        if cleaned_lines and not previous_was_blank:
            cleaned_lines.append("")
            previous_was_blank = True

    return "\n".join(cleaned_lines).strip()


def call_llm(question: str, json_summary: dict) -> str:
    """Formulates a response to user financial queries using structured DB data and LangChain."""

    # 1. Deterministic single-row fallback
    rows = json_summary.get("rows") or []
    if len(rows) == 1:
        row = rows[0]
        metric = row.get("metric_name") or "Metric"
        company = row.get("company_name") or row.get("company_symbol") or "Company"
        quarter = row.get("quarter") or "Unknown quarter"
        raw_value = row.get("raw_value")
        value_display = raw_value if raw_value is not None else row.get("value")
        return f"{metric} value of {company} in {quarter} is '{value_display}'"

    # 2. Extract payload for LLM processing
    llm_payload = {
        "query": json_summary.get("query"),
        "companies": json_summary.get("companies", {}),
        "comparison": json_summary.get("comparison", {}),
    }

    # 3. System Prompt adapted specifically for NEPSE financial assistant
    system_prompt = (
        "You are an expert, proactive NEPSE financial data assistant.\n\n"
        "RESPONSE LENGTH & DEPTH INSTRUCTIONS:\n"
        "  1. ADAPTIVE LENGTH: Match the scope and depth requested by the user.\n"
        "  2. CONCISE BY DEFAULT: For general questions, provide a clean, direct, standard-length explanation. Do not overwhelm the user with unnecessary details.\n"
        "  3. DETAILED ON DEMAND: ONLY generate long, exhaustive, step-by-step explanations if the user explicitly asks for depth (e.g., using keywords like 'explain in detail', 'step-by-step', 'elaborate', 'comprehensive', 'deep dive', or 'explain everything').\n\n"
        "CRITICAL TABLE FORMATTING RULES:\n"
        "  1. ALWAYS format tables using standard GitHub Flavored Markdown (GFM) pipe syntax.\n"
        "  2. NEVER output raw text blocks or whitespace-aligned columns for structured data.\n"
        "  3. NEVER use HTML tags like <br>, <table>, <tr>, or <td> inside table cells.\n"
        "  4. When comparing items or displaying structured data, follow this general format:\n"
        "     | Category / Feature | Company / Metric A | Company / Metric B |\n"
        "     | --- | --- | --- |\n"
        "     | Value / Metric | Detail for A | Detail for B |\n\n"
        "STRICT NEGATIVE CONSTRAINTS (DO NOT VIOLATE):\n"
        "  - NEVER use HTML tags like <br>, <br/>, <table>, <tr>, <td>, or <div>.\n"
        "  - NEVER use space-aligned or plain-text mock tables. ALWAYS use pipe syntax (`|`).\n"
        "  - Do NOT put raw HTML line breaks inside table cells.\n\n"
        "CRITICAL OUTPUT RULES:\n"
        "  1. DO NOT include internal system status, tool logs, or execution traces in your final response.\n"
        "  2. Output ONLY the response meant for the user.\n"
        "  3. Rely ONLY on the structured JSON data provided in the prompt.\n\n"
        "HEADER RULES:\n"
        "  1. ALWAYS format main section titles using Markdown heading syntax (`##` or `###`).\n"
        "  2. NEVER output section titles or topic headings as plain bold text or unformatted sentences.\n"
        "  3. Keep heading hierarchies structured:\n"
        "     - Use `##` for primary topic titles or major sections (e.g., ## Overview, ## Comparison).\n"
        "     - Use `###` for sub-sections or detailed breakdowns (e.g., ### Key Takeaways, ### Summary)."
    )

    user_prompt = (
        f"User question: {question}\n\n"
        f"Structured NEPSE data: {json.dumps(llm_payload, ensure_ascii=False, indent=2)}"
    )

    # 4. LangChain invocation using System and Human messages
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]

    response = llm.invoke(messages)

    return _sanitize_answer(str(response.content))
