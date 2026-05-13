# llm_client.py
import json
import google.generativeai as genai
try:
    from .config import settings
except ImportError:
    from config import settings

genai.configure(api_key=settings.GOOGLE_API_KEY)


def call_llm(question: str, json_summary: dict) -> str:
    llm_payload = {
        "query": json_summary.get("query"),
        "companies": json_summary.get("companies", {}),
        "comparison": json_summary.get("comparison", {}),
    }

    prompt = (
        "You are a financial analyst for NEPSE companies. Use only the JSON data below.\n"
        "The JSON contains precomputed company summaries and comparison rankings.\n"
        "Provide a comprehensive analysis using the following format:\n\n"
        "1. COMPARISON TABLE: Create a markdown table comparing companies side-by-side for key metrics.\n"
        "2. DETAILED ANALYSIS: Write 2-3 paragraphs discussing the findings, trends, and observations.\n"
        "3. KEY FINDINGS: Use bullet points to highlight major strengths, weaknesses, and insights for each company.\n"
        "4. CONCLUSION: Provide a final recommendation or summary.\n\n"
        "When multiple companies are present, compare them thoroughly and identify the stronger performers.\n"
        "If data is incomplete or metrics conflict, mention that explicitly.\n\n"
        f"User question: {question}\n\n"
        f"Structured data:\n{json.dumps(llm_payload, ensure_ascii=False, indent=2)}\n\n"
        "Provide detailed analysis with clear sections, tables, paragraphs, and lists for different types of insights."
    )

    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=settings.LLM_TEMPERATURE,
            max_output_tokens=2000,
        ),
    )

    return response.text

