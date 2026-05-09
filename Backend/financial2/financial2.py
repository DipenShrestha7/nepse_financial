import asyncio, os,random,sys,json,requests,time
from requests.exceptions import RequestException
import os
import random
from crawler2 import Crawler

# allow importing modules in the same folder when running the script directly
sys.path.insert(0, os.path.dirname(__file__))
from html_parser import parse_ratio_table_html

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

async def process_scrip(scrip):
    url = f"https://nepsealpha.com/search?q={scrip['symbol']}"
    profile_dir = os.getenv(
        "BROWSER_PROFILE_DIR",
        os.path.join(os.getcwd(), ".browser_profile_nepse"),
    )

    crawler = Crawler()

    # 0-based index: 3 means the 4th table
    section_selector = ".table-responsive"
    section_index = 3
    wait_selector = ".table-responsive"

    financial_table = await crawler.fetch_section_text(
        url=url,
        section_selector=section_selector,
        section_index=section_index,
        wait_selector=wait_selector,
        headless=True,
        user_data_dir=profile_dir,
        channel="chrome",
        return_html=True,
    )

    # Parse HTML table into structured dicts and print JSON
    # Note: section_index=3 already selected the 4th table, so we parse table_index=0
    parsed = parse_ratio_table_html(financial_table or "", table_index=0,scrip_symbol=scrip['symbol'])

    print("=== PARSED JSON ===")
    try:
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
        base_dir = os.path.dirname(__file__)
        parent_dir = os.path.dirname(base_dir)
        file_path = os.path.join(parent_dir, "insert_format_data", f"insert_format_{scrip['symbol']}.json")

        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        with open(file_path, "w") as f:
            f.write(json.dumps(parsed) + "\n")

        url = "http://127.0.0.1:8000/financial"

        if not parsed:
            print(f"No financial data extracted for {scrip['symbol']}; skipping POST")
        else:
            try:
                response = post_with_retries(url, parsed, retries=3, timeout=10, backoff=2)
                print("Response from server:", response.status_code, response.text)
            except RequestException as exc:
                print(f"Failed to POST data for {scrip['symbol']} after retries: {exc}")

    except Exception:
        print(repr(parsed))

base_dir = os.path.dirname(__file__)
parent_dir = os.path.dirname(base_dir)

file_path = os.path.join(parent_dir, "save_data", "companies2.json")

with open(file_path, "r") as f:
    scrips = json.load(f)

scrips10 = scrips[19:]
async def main():
    for scrip in scrips10:
        if str(scrip.get("symbol", "")).lower() == "rsml":
            print("Skipping rsml")
            continue
        await process_scrip(scrip)
        await asyncio.sleep(random.uniform(3, 5)) 


if __name__ == "__main__":
    asyncio.run(main())