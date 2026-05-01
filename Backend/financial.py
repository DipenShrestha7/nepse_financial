from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException, WebDriverException
import time
import json
import os
import requests
from requests.exceptions import RequestException

driver = webdriver.Chrome()

base_dir = os.path.dirname(__file__)
file_path = os.path.join(base_dir, "save_data", "companies2.json")

with open(file_path, "r") as f:
    scrips = json.load(f)


def post_with_retries(url, json_payload, retries=3, timeout=10, backoff=2):
    """Post JSON payload with simple retry/backoff on failures.

    Raises the last exception if all attempts fail.
    """
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.post(url, json=json_payload, timeout=timeout)
            resp.raise_for_status()
            return resp
        except RequestException as exc:
            last_exc = exc
            print(f"POST attempt {attempt} failed: {exc}")
            if attempt < retries:
                time.sleep(backoff * attempt)
    raise last_exc


def find_ratio_table(tables):
    expected_labels = ("PE Ratio", "PB Ratio", "ROE", "ROE TTM", "EPS")

    for table in tables:
        table_text = table.text.strip()
        if not table_text:
            continue

        if any(label in table_text for label in expected_labels):
            return table

    return None


def load_tables(driver, url, symbol, retries=2):
    for attempt in range(1, retries + 1):
        try:
            driver.get(url)

            WebDriverWait(driver, 15).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )

            WebDriverWait(driver, 15).until(
                lambda d: len(d.find_elements(By.CSS_SELECTOR, ".table-responsive")) > 0
            )

            tables = driver.find_elements(By.CSS_SELECTOR, ".table-responsive")
            ratio_table = find_ratio_table(tables)

            if ratio_table is not None:
                return ratio_table

            print(f"Ratio table not detected for {symbol} on attempt {attempt} (found {len(tables)} tables)")
        except (TimeoutException, WebDriverException) as exc:
            print(f"Load attempt {attempt} failed for {symbol}: {exc}")

        if attempt < retries:
            time.sleep(3)

    return None

scrip5 = scrips[0]

for scrip in scrip5:
    url = f"https://nepsealpha.com/search?q={scrip['symbol']}"

    ratio_table = load_tables(driver, url, scrip["symbol"])

    if ratio_table is None:
        print(f"Expected ratio table not found for {scrip['symbol']} at {url}")
        continue

    header_cells = ratio_table.find_elements(By.CSS_SELECTOR, "thead tr th")
    headers = [cell.text.strip() for cell in header_cells if cell.text.strip()]

    tbody_rows = ratio_table.find_elements(By.CSS_SELECTOR, "tbody tr")
    json_row_map = {}
    data = []
    for tr in tbody_rows:
        cols = tr.find_elements(By.TAG_NAME, "td")
        if not cols:
            continue

        raw_key = cols[0].text.strip()
        key_parts = [part.strip() for part in raw_key.split("\n") if part.strip()]
        key = key_parts[0] if key_parts else raw_key

        values = [col.text.strip() for col in cols[1:]]


        for header, value in zip(headers[1:], values):
            if header not in json_row_map:
                json_row_map[header] = {}
            value_parts = [part.strip() for part in value.split("\n") if part.strip()]
            json_row_map[header][key] = value_parts[0] if value_parts else ""

    time.sleep(2)

    # Build one object per quarter with nested metrics.
    # Use the current `scrip` from the outer loop; do not re-iterate over `scrip5` here.
    data = [{"scrip": scrip["symbol"], "quarter": quarter, "metrics": metrics} for quarter, metrics in json_row_map.items()]

    # Write out the `data` list (matches the insert format you wanted).
    json_rows = json.dumps(data, indent=4)

    base_dir = os.path.dirname(__file__)
    file_path = os.path.join(base_dir, "financial_data", f"financial_data_{scrip['symbol']}.json")

    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    with open(file_path, "w") as f:
        f.write(json_rows + "\n")

    base_dir = os.path.dirname(__file__)
    file_path = os.path.join(base_dir, "insert_format_data", f"insert_format_{scrip['symbol']}.json")

    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    with open(file_path, "w") as f:
        f.write(json.dumps(data) + "\n")

    url = "http://127.0.0.1:8000/financial"

    try:
        response = post_with_retries(url, data, retries=3, timeout=10, backoff=2)
        print("Response from server:", response.status_code, response.text)
    except RequestException as e:
        print("Failed to POST data for", scrip["symbol"], "after retries:", e)
        # continue with the next scrip instead of stopping the whole script
        continue

    time.sleep(2)

time.sleep(5)
driver.quit()
