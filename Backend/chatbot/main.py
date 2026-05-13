from __future__ import annotations

import argparse
import json
from pprint import pprint

try:
	from .query_parser import parse_question
	from .database_session import get_metrics
	from .response_formatter import format_summary
	from .llm_client import call_llm
except ImportError:
	from query_parser import parse_question
	from database_session import get_metrics
	from response_formatter import format_summary
	from llm_client import call_llm


def analyze_question(question: str) -> dict:
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
