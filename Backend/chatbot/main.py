from __future__ import annotations

import argparse
import json

try:
    from .query_parser import parse_question
    from .database_session import get_metrics
    from .response_formatter import format_summary
    from .llm_client import call_llm
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    from chatbot.query_parser import parse_question
    from chatbot.database_session import get_metrics
    from chatbot.response_formatter import format_summary
    from chatbot.llm_client import call_llm


def analyze_question(question: str) -> dict:
    parsed = parse_question(question)
    
    # 1. Cleanly handle company_ids
    company_ids_raw = parsed.get("company_ids") or ([parsed.get("company_id")] if parsed.get("company_id") is not None else [])
    company_ids = [i for i in company_ids_raw if i is not None]

    # 2. Cleanly handle company_symbols (Guarantees list[str])
    company_symbols_raw = parsed.get("company_symbols") or ([parsed.get("company_symbol") or parsed.get("symbol")] if parsed.get("company_symbol") or parsed.get("symbol") else [])
    company_symbols = [str(s) for s in company_symbols_raw if s is not None]

    # 3. Cleanly handle company_names (Guarantees list[str])
    company_names_raw = parsed.get("company_names") or ([parsed.get("company_name") or parsed.get("company")] if parsed.get("company_name") or parsed.get("company") else [])
    company_names = [str(n) for n in company_names_raw if n is not None]

    try:
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
    except ValueError as exc:
        # Handle database errors gracefully
        return {
            "answer": f"I encountered an issue: {str(exc)}",
            "error": True,
            "parsed": parsed,
        }

    summary = format_summary(rows, parsed)
    answer = call_llm(question, summary)

    return {
        "question": question,
        "parsed": parsed,
        "summary": summary,
        "answer": answer,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the NEPSE chatbot backend without the frontend.")
    parser.add_argument("question", nargs="?", help="User prompt to analyze")
    parser.add_argument("--json", action="store_true", help="Print the full result as JSON")
    args = parser.parse_args()

    question = args.question
    if not question:
        question = input("Enter your question: ").strip()

    if not question:
        raise SystemExit("No question provided.")

    result = analyze_question(question)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return

    print("\nAnswer:\n")
    print(result["answer"])


if __name__ == "__main__":
    main()
