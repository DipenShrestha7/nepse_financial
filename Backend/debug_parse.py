import sys
import json
from chatbot.query_parser import parse_question
from chatbot.database_session import get_metrics

q = sys.argv[1] if len(sys.argv) > 1 else 'what is the eps of nabil for 2080/81 quarter?'
print('QUESTION:', q)
parsed = parse_question(q)
print('PARSED:')
print(json.dumps(parsed, indent=2))

# Try fetching with parsed filters
rows = get_metrics(
    quarters=parsed.get('quarters'),
    metric_ids=parsed.get('metric_ids'),
    company_id=parsed.get('company_id'),
    company_symbol=parsed.get('company_symbol') or (parsed.get('company_symbols') or [None])[0],
    company_name=parsed.get('company_name') or (parsed.get('company_names') or [None])[0],
    company_ids=parsed.get('company_ids'),
    company_symbols=parsed.get('company_symbols'),
    company_names=parsed.get('company_names'),
)
print('\nROWS (filtered) count:', len(rows))
if rows:
    print(json.dumps(rows[:20], indent=2, default=str))
else:
    # fallback: fetch all rows for company symbol or name to inspect
    cs = parsed.get('company_symbol') or (parsed.get('company_symbols') or [None])[0]
    cn = parsed.get('company_name') or (parsed.get('company_names') or [None])[0]
    if cs or cn:
        print('\nTrying fallback fetch for company...')
        all_rows = get_metrics(
            quarters=None,
            metric_ids=None,
            company_id=None,
            company_symbol=cs,
            company_name=cn,
            company_ids=None,
            company_symbols=None,
            company_names=None,
        )
        print('FALLBACK ROWS count:', len(all_rows))
        print(json.dumps(all_rows[:40], indent=2, default=str))
    else:
        print('No company parsed; cannot fetch rows.')
