# fuzzy_matcher.py
"""
Fuzzy matching utilities for handling typos and variations in user input.
Provides flexible company, metric, and quarter matching with confidence scores.
"""

from difflib import SequenceMatcher
from typing import Optional
try:
    from fuzzywuzzy import fuzz
    HAS_FUZZYWUZZY = True
except ImportError:
    fuzz = None
    HAS_FUZZYWUZZY = False


def simple_ratio(a: str, b: str) -> float:
    """Fallback similarity ratio using difflib if fuzzywuzzy not available."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def get_similarity_score(query: str, target: str) -> float:
    """Get similarity score between query and target string.
    
    Returns score 0.0 to 1.0, where 1.0 is exact match.
    Uses fuzzywuzzy if available, otherwise difflib.
    """
    if not query or not target:
        return 0.0
    
    if HAS_FUZZYWUZZY and fuzz is not None:
        # Use token_set_ratio for partial matches (handles word order)
        score = fuzz.token_set_ratio(query.lower(), target.lower()) / 100.0
    else:
        score = simple_ratio(query, target)
    
    return score


def find_best_match(query: str, candidates: list[str], threshold: float = 0.6) -> Optional[tuple[str, float]]:
    """Find the best matching candidate for a query.
    
    Args:
        query: User input query
        candidates: List of valid candidates to match against
        threshold: Minimum similarity score (0.0 to 1.0)
    
    Returns:
        Tuple of (best_match, confidence_score) or None if no good match found
    """
    if not candidates:
        return None
    
    scores = [(candidate, get_similarity_score(query, candidate)) for candidate in candidates]
    best_match, best_score = max(scores, key=lambda x: x[1])
    
    if best_score >= threshold:
        return (best_match, best_score)
    
    return None


def find_multiple_matches(query: str, candidates: list[str], top_n: int = 3, threshold: float = 0.5) -> list[tuple[str, float]]:
    """Find top N matching candidates for a query.
    
    Args:
        query: User input query
        candidates: List of valid candidates to match against
        top_n: Number of top matches to return
        threshold: Minimum similarity score
    
    Returns:
        List of (candidate, score) tuples sorted by score descending
    """
    if not candidates:
        return []
    
    scores = [(candidate, get_similarity_score(query, candidate)) for candidate in candidates]
    # Filter by threshold and sort
    filtered = [(c, s) for c, s in scores if s >= threshold]
    filtered.sort(key=lambda x: x[1], reverse=True)
    
    return filtered[:top_n]


def normalize_company_input(input_str: str, valid_companies: list[dict]) -> Optional[dict]:
    """Normalize company input with fuzzy matching support.
    
    Args:
        input_str: User input (name or symbol)
        valid_companies: List of {"name": str, "symbol": str} dicts
    
    Returns:
        Matched company dict or None
    """
    if not input_str or not valid_companies:
        return None
    
    # Build lists of names and symbols for matching
    names = [c["name"] for c in valid_companies]
    symbols = [c["symbol"] for c in valid_companies]
    all_candidates = [(c["name"], c) for c in valid_companies] + [(c["symbol"], c) for c in valid_companies]
    
    # Try exact match first (case-insensitive)
    lower_input = input_str.lower()
    for candidate_text, company in all_candidates:
        if candidate_text.lower() == lower_input:
            return company
    
    # Try fuzzy match
    candidates_text = [text for text, _ in all_candidates]
    match = find_best_match(input_str, candidates_text, threshold=0.6)
    
    if match:
        matched_text, score = match
        # Find which company this text belongs to
        for candidate_text, company in all_candidates:
            if candidate_text == matched_text:
                return {**company, "confidence": score}
    
    return None


def find_company_suggestions(input_str: str, valid_companies: list[dict], top_n: int = 3) -> list[dict]:
    """Get suggestions for a company input.
    
    Args:
        input_str: User input
        valid_companies: List of {"name": str, "symbol": str} dicts
        top_n: Number of suggestions
    
    Returns:
        List of company dicts with confidence scores
    """
    if not input_str or not valid_companies:
        return []
    
    all_candidates = []
    for c in valid_companies:
        all_candidates.append((c["name"], c))
        all_candidates.append((c["symbol"], c))
    
    candidates_text = [text for text, _ in all_candidates]
    matches = find_multiple_matches(input_str, candidates_text, top_n=top_n * 2, threshold=0.4)
    
    # Deduplicate by company
    seen = set()
    suggestions = []
    for text, score in matches:
        for candidate_text, company in all_candidates:
            if candidate_text == text:
                key = (company["symbol"], company["name"])
                if key not in seen:
                    seen.add(key)
                    suggestions.append({**company, "confidence": score})
                break
    
    return suggestions[:top_n]


def normalize_metric_input(input_str: str, valid_metrics: list[str]) -> Optional[tuple[str, float]]:
    """Normalize metric input with fuzzy matching.
    
    Args:
        input_str: User input (e.g., "eps", "EPS TTM")
        valid_metrics: List of valid metric names
    
    Returns:
        Tuple of (matched_metric, confidence_score) or None
    """
    if not input_str or not valid_metrics:
        return None
    
    # Try exact match first
    lower_input = input_str.lower()
    for metric in valid_metrics:
        if metric.lower() == lower_input:
            return (metric, 1.0)
    
    # Try substring match (e.g., "eps" should match "EPS TTM")
    for metric in valid_metrics:
        if lower_input in metric.lower() or metric.lower() in lower_input:
            return (metric, 0.95)
    
    # Try fuzzy match
    match = find_best_match(input_str, valid_metrics, threshold=0.6)
    if match:
        return match
    
    return None


def normalize_quarter_input(input_str: str, valid_quarters: list[str]) -> Optional[tuple[str, float]]:
    """Normalize quarter input with flexible format support.
    
    Args:
        input_str: User input (e.g., "Q3", "081-082Q3", "2081-82Q3")
        valid_quarters: List of valid quarter strings in DB format
    
    Returns:
        Tuple of (normalized_quarter, confidence_score) or None
    """
    if not input_str or not valid_quarters:
        return None
    
    # Try exact match first
    if input_str in valid_quarters:
        return (input_str, 1.0)
    
    # Try case-insensitive match
    lower_input = input_str.lower().replace(" ", "")
    for quarter in valid_quarters:
        if quarter.lower() == lower_input:
            return (quarter, 1.0)
    
    # Try substring match (e.g., "Q3" could match "081-082Q3")
    for quarter in valid_quarters:
        if lower_input in quarter.lower():
            return (quarter, 0.85)
    
    # Try fuzzy match
    match = find_best_match(input_str, valid_quarters, threshold=0.6)
    if match:
        return match
    
    return None
