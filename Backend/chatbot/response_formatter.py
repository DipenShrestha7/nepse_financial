import re
from collections import defaultdict


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


def pct_change(old, new):
    if old is None or new is None:
        return None
    try:
        if old == 0:
            return None
        return round((new - old) / abs(old) * 100, 2)
    except Exception:
        return None


def _company_key(row):
    return row["company_symbol"] or str(row["company_id"])


def _latest_item(items):
    return sorted(items, key=lambda item: item["quarter"])[-1]


def format_summary(rows, query=None):
    normalized_rows = []
    companies = defaultdict(lambda: {"company_id": None, "company_name": None, "company_symbol": None, "metrics": defaultdict(list)})

    for row in rows:
        value, unit = normalize_value(row["value"])
        normalized_row = {
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
        }
        normalized_rows.append(normalized_row)

        company_bucket = companies[_company_key(row)]
        company_bucket["company_id"] = row["company_id"]
        company_bucket["company_name"] = row["company_name"]
        company_bucket["company_symbol"] = row["company_symbol"]
        company_bucket["metrics"][row["metric_name"]].append(normalized_row)

    company_summary = {}
    comparison = defaultdict(list)

    for key, company in companies.items():
        metrics = {}
        latest_metrics = {}
        for metric_name, items in company["metrics"].items():
            ordered = sorted(items, key=lambda item: item["quarter"])
            latest = ordered[-1]
            previous = ordered[-2] if len(ordered) > 1 else None
            change_pct = pct_change(previous["value"], latest["value"]) if previous else None

            metrics[metric_name] = {
                "series": ordered,
                "latest": latest,
                "previous": previous,
                "change_pct": change_pct,
            }
            latest_metrics[metric_name] = {
                "quarter": latest["quarter"],
                "value": latest["value"],
                "unit": latest["unit"],
                "raw_value": latest["raw_value"],
                "change_pct": change_pct,
            }

            comparison[metric_name].append({
                "company_id": company["company_id"],
                "company_name": company["company_name"],
                "company_symbol": company["company_symbol"],
                "quarter": latest["quarter"],
                "value": latest["value"],
                "unit": latest["unit"],
                "raw_value": latest["raw_value"],
                "change_pct": change_pct,
            })

        company_summary[key] = {
            "company_id": company["company_id"],
            "company_name": company["company_name"],
            "company_symbol": company["company_symbol"],
            "latest_metrics": latest_metrics,
            "metrics": metrics,
        }

    comparison_overview = {}
    for metric_name, entries in comparison.items():
        comparison_overview[metric_name] = sorted(
            entries,
            key=lambda item: (item["value"] is None, item["value"]),
            reverse=True,
        )

    summary = {
        "rows": normalized_rows,
        "companies": company_summary,
        "comparison": comparison_overview,
    }
    if query is not None:
        summary["query"] = query
    return summary
