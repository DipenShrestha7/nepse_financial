from typing import List, Optional
from bs4 import BeautifulSoup


def parse_ratio_table_html(html: str, table_index: int = 3, scrip_symbol: Optional[str] = None):
    """Parse an HTML table into a list of dicts matching your Selenium logic.

    Returns a list like: [{"scrip": symbol, "quarter": quarter, "metrics": {...}}, ...]
    """
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")
    if len(tables) <= table_index:
        return []

    ratio_table = tables[table_index]

    thead = ratio_table.find("thead")
    if thead:
        headers = [th.get_text(strip=True) for th in thead.select("tr th") if th.get_text(strip=True)]
    else:
        first_row = ratio_table.find("tr")
        headers = [c.get_text(strip=True) for c in (first_row.find_all(["th", "td"]) if first_row else [])]

    tbody = ratio_table.find("tbody") or ratio_table
    rows = tbody.find_all("tr")

    json_row_map = {}
    for tr in rows:
        cols = tr.find_all(["td", "th"])
        if not cols:
            continue

        raw_key = cols[0].get_text("\n", strip=True)
        key_parts = [p.strip() for p in raw_key.splitlines() if p.strip()]
        key = key_parts[0] if key_parts else raw_key

        values = [col.get_text("\n", strip=True) for col in cols[1:]]

        for header, value in zip(headers[1:], values):
            json_row_map.setdefault(header, {})[key] = (value.splitlines()[0].strip() if value else "")

    data = [
        {"scrip": scrip_symbol, "quarter": quarter, "metrics": metrics}
        for quarter, metrics in json_row_map.items()
    ]
    return data
