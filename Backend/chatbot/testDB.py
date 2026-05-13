import json

try:
    from .database_session import get_metrics
except ImportError:
    from database_session import get_metrics

rows = get_metrics(
    company_id=[273, 274],
    quarters=["080-081Q4"],
    metric_ids=[1, 2, 3,9,10]
)

print(rows)

print(json.dumps(rows, indent=2, ensure_ascii=False))