from __future__ import annotations

import json
import re
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
COMPANIES_FILE = BASE_DIR / "Frontend" / "companies.json"


def _load_companies() -> list[dict]:
	if not COMPANIES_FILE.exists():
		return []
	with COMPANIES_FILE.open("r", encoding="utf-8") as handle:
		data = json.load(handle)

	companies = []
	for company_name, details in data.items():
		symbol = str(details.get("company_name", "")).strip()
		if not symbol:
			continue
		companies.append(
			{
				"company_name": company_name,
				"company_symbol": symbol,
				"normalized_name": company_name.lower(),
				"normalized_symbol": symbol.lower(),
			}
		)
	return companies


COMPANIES = _load_companies()


def _extract_quarters(question: str) -> list[str] | None:
	matches = re.findall(r"\b\d{2,3}-\d{2,3}Q[1-4]\b", question, flags=re.IGNORECASE)
	quarters = list(dict.fromkeys(match.upper() for match in matches))
	return quarters or None


def _extract_companies(question: str) -> list[dict]:
	lowered = question.lower()
	matches = []

	for company in sorted(COMPANIES, key=lambda item: len(item["normalized_name"]), reverse=True):
		if re.search(rf"(?<!\w){re.escape(company['normalized_name'])}(?!\w)", lowered):
			matches.append(
				{
					"company_name": company["company_name"],
					"company_symbol": company["company_symbol"],
				}
			)

	symbol_pattern = r"\b[A-Z][A-Z0-9]{1,8}\b"
	for symbol in re.findall(symbol_pattern, question):
		symbol_lower = symbol.lower()
		for company in COMPANIES:
			if company["normalized_symbol"] == symbol_lower:
				matches.append(
					{
						"company_name": company["company_name"],
						"company_symbol": company["company_symbol"],
					}
				)
				break

	deduped = []
	seen = set()
	for item in matches:
		key = (item["company_name"].lower(), item["company_symbol"].lower())
		if key in seen:
			continue
		seen.add(key)
		deduped.append(item)
	return deduped


def parse_question(question: str) -> dict:
	companies = _extract_companies(question)
	quarters = _extract_quarters(question)

	parsed = {
		"question": question,
		"companies": companies,
		"company_names": [company["company_name"] for company in companies] or None,
		"company_symbols": [company["company_symbol"] for company in companies] or None,
		"quarters": quarters,
		"metric_ids": None,
	}

	if len(companies) == 1:
		parsed["company_name"] = companies[0]["company_name"]
		parsed["company_symbol"] = companies[0]["company_symbol"]

	return parsed
