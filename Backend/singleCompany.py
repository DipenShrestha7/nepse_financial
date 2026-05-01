from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import json
import os
from fastapi import FastAPI
import requests

app = FastAPI()
driver = webdriver.Chrome()
wait = WebDriverWait(driver, 15)

url = "https://www.nepalstock.com/company"

driver.get(url)

dropdown = wait.until(
    EC.presence_of_element_located((
        By.XPATH,
        "//span[text()='Items Per Page']/following::select[1]"
    ))
)

select = Select(dropdown)
select.select_by_visible_text("500")
filter_btn = wait.until(
    EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Filter']"))
)
filter_btn.click()


wait.until(
    lambda d: len(d.find_elements(By.CLASS_NAME, "table-responsive")) > 0
)

table_container = driver.find_elements(By.CLASS_NAME, "table-responsive")

table = table_container[0].find_element(By.TAG_NAME, "table")

rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")
    
data = []

for row in rows:
    cols = row.find_elements(By.TAG_NAME, "td")
    
    scrip = cols[2].text
    company_name = cols[1].text
    sector = cols[4].text
    
    data.append({
        "symbol": scrip,
        "name": company_name,
        "sector": sector
    })

url = "http://127.0.0.1:8000/companies"

response = requests.post(url, json=data)
print("Response from server:", response.status_code, response.text)

# base_dir = os.path.dirname(__file__)
# file_path = os.path.join(base_dir, "save_data", "companies2.json")

# os.makedirs(os.path.dirname(file_path), exist_ok=True)

# with open(file_path, "w") as f:
#     json.dump(data, f,indent=4)

time.sleep(5)
driver.quit()
