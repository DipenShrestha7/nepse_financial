import re

def normalize_value(raw: str):
    if raw is None:
        return None, None

    if isinstance(raw, (int, float)):
        return float(raw), "number"

    s = raw.strip().replace(",", "")
    if s.endswith("%"):
        return float(s.rstrip("%").strip()), "percent"

    m = re.match(r"^([-0-9.]+)\s*(Cr|Cr\.|Crore|crore|Lac|Lacs|Lakh|Lakhs)?$", s)
    if m:
        v = float(m.group(1))
        unit_token = (m.group(2) or "").lower()
        if unit_token.startswith("cr") or unit_token == "crore":
            unit = "crore"
        elif unit_token in {"lac", "lacs", "lakh", "lakhs"}:
            unit = "lakh"
        else:
            unit = "number"
        return v, unit

    try:
        return float(s), "number"
    except ValueError:
        return None, None

def format_summary(rows, query=None):
    normalized_rows = []
    for row in rows:
        value, unit = normalize_value(row["value"])
        normalized_rows.append({
            "company_id": row["company_id"],
            "company_name": row["company_name"],
            "company_symbol": row["company_symbol"],
            "metric_id": row["metric_id"],
            "metric_name": row["metric_name"],
            "quarter": row["quarter"],
            "value": value,
            "unit": unit,
            "raw_value": row["value"],
            "row_id": row["row_id"],
        })

    summary = {"rows": normalized_rows}
    if query is not None:
        summary["query"] = query
    return summary