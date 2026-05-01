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
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            response = requests.post(url, json=json_payload, timeout=timeout)
            response.raise_for_status()
            return response
        except RequestException as exc:
            last_exc = exc
            print(f"POST attempt {attempt} failed: {exc}")
            if attempt < retries:
                time.sleep(backoff * attempt)

    raise last_exc

scrip = scrips[8]
url = f"https://nepsealpha.com/search?q={scrip['symbol']}"

driver.get(url)

WebDriverWait(driver, 10).until(
    lambda d: len(d.find_elements(By.CSS_SELECTOR, ".table-responsive")) > 0
)

tables = driver.find_elements(By.CSS_SELECTOR, ".table-responsive")

ratio_table = tables[3]

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

if not data:
    print(f"No financial data extracted for {scrip['symbol']}; skipping POST")
else:
    try:
        response = post_with_retries(url, data, retries=3, timeout=10, backoff=2)
        print("Response from server:", response.status_code, response.text)
    except RequestException as exc:
        print(f"Failed to POST data for {scrip['symbol']} after retries: {exc}")


time.sleep(5)
driver.quit()
