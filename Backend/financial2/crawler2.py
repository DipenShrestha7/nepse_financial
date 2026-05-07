from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from playwright.async_api import async_playwright

STEALTH_INIT_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = window.chrome || { runtime: {} };
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
"""

class Crawler:
    def __init__(self):
        self.crawler = AsyncWebCrawler(config=BrowserConfig(verbose=False))

    async def fetch(
        self,
        url,
        css_selector=None,
        wait_for=None,
        js_code=None,
        delay_before_return_html=0.1,
    ):
        async with self.crawler as crawler:
            run_config = CrawlerRunConfig(
                css_selector=css_selector,
                wait_for=wait_for,
                js_code=js_code,
                process_in_browser=bool(js_code),
                delay_before_return_html=delay_before_return_html,
            )
            result = await crawler.arun(url=url, config=run_config)
            return result

    async def fetch_section_text(
        self,
        url,
        section_selector=None,
        section_index=None,
        wait_selector=None,
        headless=True,
        user_data_dir=None,
        channel="chrome",
        timeout=30000,
        return_html: bool = False,
    ):
        async with async_playwright() as playwright:
            browser = None
            context = None
            page = None

            try:
                if user_data_dir:
                    context = await playwright.chromium.launch_persistent_context(
                        user_data_dir=user_data_dir,
                        channel=channel,
                        headless=headless,
                        args=["--disable-blink-features=AutomationControlled"],
                        ignore_default_args=["--enable-automation"],
                        locale="en-US",
                        viewport={"width": 1366, "height": 768},
                        user_agent=(
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/136.0.0.0 Safari/537.36"
                        ),
                    )
                    await context.add_init_script(STEALTH_INIT_SCRIPT)
                else:
                    browser = await playwright.chromium.launch(
                        headless=headless,
                        args=["--disable-blink-features=AutomationControlled"],
                    )
                    context = await browser.new_context(
                        locale="en-US",
                        viewport={"width": 1366, "height": 768},
                        user_agent=(
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/136.0.0.0 Safari/537.36"
                        ),
                    )
                    await context.add_init_script(STEALTH_INIT_SCRIPT)

                page = await context.new_page()
                await page.goto(url, wait_until="networkidle", timeout=timeout)

                if wait_selector:
                    try:
                        await page.wait_for_selector(wait_selector, state="attached", timeout=timeout)
                    except Exception:
                        # Some pages keep the table container hidden or swap it in late.
                        # Continue and let the section extraction logic decide whether content is present.
                        pass

                if section_selector:
                    if section_index is not None:
                        count = await page.locator(section_selector).count()
                        if count <= section_index:
                            return ""

                        target = page.locator(section_selector).nth(section_index)
                        try:
                            if return_html:
                                content = await target.inner_html()
                            else:
                                content = await target.inner_text()
                        except Exception:
                            content = await target.inner_html()
                    else:
                        try:
                            if return_html:
                                content = await page.inner_html(section_selector)
                            else:
                                content = await page.inner_text(section_selector)
                        except Exception:
                            content = await page.inner_html(section_selector)
                else:
                    content = await page.content()

                return content
            finally:
                try:
                    if page:
                        await page.close()
                except Exception:
                    pass
                try:
                    if context:
                        await context.close()
                except Exception:
                    pass
                try:
                    if browser:
                        await browser.close()
                except Exception:
                    pass