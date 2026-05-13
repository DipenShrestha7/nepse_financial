# llm_client.py
import json
import google.generativeai as genai
try:
    from .config import settings
except ImportError:
    from config import settings

genai.configure(api_key=settings.GOOGLE_API_KEY)


def call_llm(question: str, json_summary: dict) -> str:
    prompt = (
        "You are a financial analyst for NEPSE companies. Use only the JSON data below.\n"
        "Your job is to answer the user question with a short, clear summary, not to repeat the raw data.\n"
        "If multiple companies are present, compare them and say which looks stronger based on the available metrics.\n"
        "If the data is incomplete, say so briefly.\n\n"
        f"User question: {question}\n\n"
        f"JSON data:\n{json.dumps(json_summary)}\n\n"
        "Return a concise comparison summary in plain English and mention the metrics or quarters used."
    )
    
    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=settings.LLM_TEMPERATURE,
            max_output_tokens=500,
        ),
    )
    
    return response.text

