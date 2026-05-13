# database_session.py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
try:
  from .config import settings
except ImportError:
  from config import settings

engine = create_engine(settings["DATABASE_URL"], pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

def get_metrics(
  company_id: int | None = None,
  quarters: list[str] | None = None,
  metric_ids: list[int] | None = None,
  company_symbol: str | None = None,
  company_name: str | None = None,
  company_ids: list[int] | None = None,
  company_symbols: list[str] | None = None,
  company_names: list[str] | None = None,
):
  ids = list(company_ids or ([] if company_id is None else [company_id]))
  symbols = [value.lower() for value in (company_symbols or ([] if company_symbol is None else [company_symbol]))]
  names = [value.lower() for value in (company_names or ([] if company_name is None else [company_name]))]

  company_clauses = []
  params = {
    "quarters": quarters,
    "metric_ids": metric_ids,
  }

  if ids:
    company_clauses.append("n.id = ANY(:company_ids)")
    params["company_ids"] = ids
  if symbols:
    company_clauses.append("LOWER(n.symbol) = ANY(:company_symbols)")
    params["company_symbols"] = symbols
  if names:
    company_clauses.append("LOWER(n.name) = ANY(:company_names)")
    params["company_names"] = names

  if not company_clauses:
    raise ValueError("At least one company filter is required")

  company_where = " OR ".join(company_clauses)
  optional_clauses = []
  if quarters:
    optional_clauses.append("f.quarter = ANY(:quarters)")
  if metric_ids:
    optional_clauses.append("f.metric_id = ANY(:metric_ids)")

  optional_where = " AND ".join(optional_clauses)
  optional_where_sql = f"AND {optional_where}" if optional_where else ""
  q = text(f"""
      SELECT
        n.id AS company_id,
        n.name AS company_name,
        n.symbol AS company_symbol,
        m.id AS metric_id,
        m.name AS metric_name,
        f.quarter,
        f.value,
        f.id AS row_id
      FROM nepse_companies n
      JOIN financial_data f
        ON n.id = f.company_id
      JOIN metrics m
        ON m.id = f.metric_id
      WHERE (
          {company_where}
        )
        {optional_where_sql}
      ORDER BY f.quarter, m.id
    """)
  with SessionLocal() as db:
    rows = db.execute(q, params).mappings().all()
  return [dict(r) for r in rows]