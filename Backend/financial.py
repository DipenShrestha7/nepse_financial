from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
import time
import json
import os
import requests

driver = webdriver.Chrome()

base_dir = os.path.dirname(__file__)
file_path = os.path.join(base_dir, "save_data", "companies2.json")

with open(file_path, "r") as f:
    scrips = json.load(f)

# for scrip in list(scrips.keys()):

url = f"https://nepsealpha.com/search?q={scrips[0]['symbol']}"

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
        metric_value = value_parts[0] if value_parts else ""
        json_row_map[header][key] = metric_value

# Build one object per quarter: {"quarter": "...", "EPS": "...", ...}
data = [{"quarter": quarter, **metrics} for quarter, metrics in json_row_map.items()]
        

json_rows = json.dumps(json_row_map, indent=4)

base_dir = os.path.dirname(__file__)
file_path = os.path.join(base_dir, "save_data", "financial_data.json")

os.makedirs(os.path.dirname(file_path), exist_ok=True)

with open(file_path, "w") as f:
    f.write(json_rows + "\n")

# url = "http://127.0.0.1:8000/companies"

# response = requests.post(url, json=data)
# print("Response from server:", response.status_code, response.text)

print(data)
base_dir = os.path.dirname(__file__)
file_path = os.path.join(base_dir, "save_data", "financial_data2.json")

os.makedirs(os.path.dirname(file_path), exist_ok=True)

with open(file_path, "w") as f:
    f.write(json.dumps(data) + "\n")

time.sleep(5)
driver.quit()
