from __future__ import annotations

import json
import re
from pathlib import Path

try:
	from .fuzzy_matcher import normalize_company_input, normalize_metric_input, find_company_suggestions
except ImportError:
	import importlib
	_fuzzy = importlib.import_module("fuzzy_matcher")
	normalize_company_input = _fuzzy.normalize_company_input
	normalize_metric_input = _fuzzy.normalize_metric_input
	find_company_suggestions = _fuzzy.find_company_suggestions


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
	# Match existing normalized forms like '080-081Q3'
	matches = re.findall(r"\b\d{2,3}-\d{2,3}Q[1-4]\b", question, flags=re.IGNORECASE)
	if matches:
		quarters = list(dict.fromkeys(match.upper() for match in matches))
		return quarters or None

	# Match user-friendly forms like '2080/81Q3', '2080-81 Q3', '2080/81 Q3'
	m2 = re.findall(r"\b(\d{3,4})[\/-](\d{2,3})\s*(?:q|Q)?([1-4])\b", question, flags=re.IGNORECASE)
	if m2:
		quarters = []
		for a, b, q in m2:
			y1 = a[-3:]
			y2 = b[-2:].zfill(3)  # Pad to 3 digits: "81" -> "081", "82" -> "082"
			quarters.append(f"{y1}-{y2}Q{q}")
		return list(dict.fromkeys(q.upper() for q in quarters))

	# Match fiscal-year without explicit quarter, e.g., '2080/81' or '2080-81'
	fy = re.findall(r"\b(\d{3,4})[\/-](\d{2,3})\b", question, flags=re.IGNORECASE)
	if fy:
		fiscal_years = []
		for a, b in fy:
			y1 = a[-3:]
			y2 = b[-2:].zfill(3)  # Pad to 3 digits: "81" -> "081", "82" -> "082"
			fiscal_years.append(f"{y1}-{y2}")
		# return fiscal years as a special token using the same field (caller should check)
		return list(dict.fromkeys(fiscal_years))

	return None


def _extract_companies(question: str) -> list[dict]:
	"""Extract companies from question using exact and fuzzy matching.
	
	Returns list of company dicts with company_name and company_symbol.
	For fuzzy matches, includes 'confidence' score and 'matched_text' field.
	"""
	lowered = question.lower()
	matches = []
	seen = set()

	# 1. Try exact company name matches (sorted by length to prefer longer names)
	for company in sorted(COMPANIES, key=lambda item: len(item["normalized_name"]), reverse=True):
		if re.search(rf"(?<!\w){re.escape(company['normalized_name'])}(?!\w)", lowered):
			key = (company["company_symbol"])
			if key not in seen:
				seen.add(key)
				matches.append({
					"company_name": company["company_name"],
					"company_symbol": company["company_symbol"],
					"match_type": "exact_name",
				})

	# 2. Try exact symbol matches
	symbol_pattern = r"\b[A-Za-z][A-Za-z0-9]{1,8}\b"
	for symbol in re.findall(symbol_pattern, question):
		symbol_lower = symbol.lower()
		for company in COMPANIES:
			if company["normalized_symbol"] == symbol_lower:
				key = company["company_symbol"]
				if key not in seen:
					seen.add(key)
					matches.append({
						"company_name": company["company_name"],
						"company_symbol": company["company_symbol"],
						"match_type": "exact_symbol",
					})
				break

	# 3. If no exact matches, try fuzzy matching on unmatched tokens
	if not matches:
		# Extract potential company mentions (words/phrases not matching numbers/dates)
		# Remove common words and date patterns
		text = re.sub(r'\b\d{3,4}[-/]\d{2,3}(?:Q[1-4])?\b', '', question)  # Remove quarters
		text = re.sub(r'\b(?:the|for|of|in|at|on|and|or|is|are|what|where|when|how|why|as|by)\b', '', text, flags=re.IGNORECASE)
		potential_matches = text.split()
		
		for token in potential_matches:
			if len(token) < 2:  # Skip single characters
				continue
			
			# Try to match this token to a company
			company_list = [{"name": c["company_name"], "symbol": c["company_symbol"]} for c in COMPANIES]
			result = normalize_company_input(token, company_list)
			
			if result and result["symbol"] not in seen:
				confidence = result.get("confidence", 0.7)
				# Only add if confidence is reasonable
				if confidence >= 0.6:
					seen.add(result["symbol"])
					matches.append({
						"company_name": result["name"],
						"company_symbol": result["symbol"],
						"match_type": "fuzzy",
						"confidence": confidence,
						"matched_text": token,
					})
	
	return matches


def _extract_metrics(question: str) -> list[str] | None:
	"""Extract metrics from question using exact and fuzzy matching.
	
	Handles variations like "eps" -> "EPS TTM", "profit margin" -> "Net Margin TTM"
	"""
	lowered = question.lower()
	metric_map = {
		r"\beps\s*ttm\b": "EPS TTM",
		r"\beps\b": "EPS TTM",  # Default EPS to EPS TTM
		r"\bbvps\b": "BVPS",
		r"\bpe\s*ratio\b": "PE Ratio",
		r"\bp\/e\b": "PE Ratio",
		r"\bpb\s*ratio\b": "PB Ratio",
		r"\bp\/b\b": "PB Ratio",
		r"\broe\s*ttm\b": "ROE TTM",
		r"\broe\b": "ROE TTM",
		r"\broa\s*ttm\b": "ROA TTM",
		r"\broa\b": "ROA TTM",
		r"\bnet\s*margin\b": "Net Margin TTM",
		r"\bprofit\s*margin\b": "Net Margin TTM",
		r"\basset\s*turnover\b": "Asset Turnover TTM",
		r"\bnet\s*profit\b": "Net Profit TTM",
		r"\brevenue\b": "Revenue TTM",
	}

	found = []
	for pattern, canonical in metric_map.items():
		if re.search(pattern, lowered):
			found.append(canonical)

	# If no exact matches, try fuzzy matching on remaining tokens
	if not found:
		# Extract potential metric mentions
		valid_metrics = list(set(metric_map.values()))
		text = re.sub(r'\b(?:the|for|of|in|at|on|and|or|is|are|what|where|when|how|why|as|by|a|an)\b', '', lowered, flags=re.IGNORECASE)
		potential_matches = text.split()
		
		for token in potential_matches:
			if len(token) < 2:
				continue
			
			result = normalize_metric_input(token, valid_metrics)
			if result:
				metric, confidence = result
				if metric not in found and confidence >= 0.6:
					found.append(metric)

	return found or None


def parse_question(question: str) -> dict:
	"""Parse a question and extract companies, quarters, and metrics.
	
	Returns a dict with:
	- question: Original question
	- companies: List of matched companies
	- company_names, company_symbols: Lists of names/symbols
	- quarters: List of matched quarters
	- metric_names: List of matched metrics
	- suggestions: Dict with suggestions if matches are low confidence
	- metadata: Dict with match types and confidence scores
	"""
	companies = _extract_companies(question)
	quarters = _extract_quarters(question)
	metrics = _extract_metrics(question)

	parsed = {
		"question": question,
		"companies": companies,
		"company_names": [company["company_name"] for company in companies] or None,
		"company_symbols": [company["company_symbol"] for company in companies] or None,
		"quarters": quarters,
		"metric_ids": None,
		"metric_names": metrics,
		"suggestions": {},
		"metadata": {
			"has_fuzzy_matches": any(c.get("match_type") == "fuzzy" for c in companies),
			"fuzzy_companies": [c for c in companies if c.get("match_type") == "fuzzy"],
		},
	}

	# Add suggestions if no exact company matches but there are fuzzy matches
	if companies:
		fuzzy_matches = [c for c in companies if c.get("match_type") == "fuzzy"]
		if fuzzy_matches and len(fuzzy_matches) == len(companies):
			# All matches are fuzzy, add suggestions
			parsed["suggestions"]["company_clarification"] = "I found a match, but I'm not 100% sure. Did you mean: " + ", ".join(
				[f"{c['company_symbol']} ({c['company_name']})" for c in companies]
			)

	if len(companies) == 1:
		parsed["company_name"] = companies[0]["company_name"]
		parsed["company_symbol"] = companies[0]["company_symbol"]

	return parsed


def get_company_suggestions(partial_input: str) -> list[dict]:
	"""Get company suggestions for a partial or unclear input.
	
	Returns list of company dicts with confidence scores.
	"""
	if not partial_input:
		return []
	
	company_list = [{"name": c["company_name"], "symbol": c["company_symbol"]} for c in COMPANIES]
	return find_company_suggestions(partial_input, company_list, top_n=5)
