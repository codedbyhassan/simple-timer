import os
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:5199'
OUT = os.path.join(os.getcwd(), 'artifacts', 'shots')
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    context = browser.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='light')
    page = context.new_page()
    errors = []
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    page.on('pageerror', lambda error: errors.append(str(error)))

    page.goto(BASE + '/signin')
    page.wait_for_selector('#local-profile')
    option = next(item for item in page.locator('#local-profile option').all() if item.inner_text().startswith('Hospital administrator'))
    page.select_option('#local-profile', value=option.get_attribute('value'))
    page.click('button[type=submit]')
    page.wait_for_url('**/admin/overview')
    page.wait_for_selector('.hms-management')
    page.screenshot(path=OUT + 'admin-overview-light.png')

    page.set_viewport_size({'width': 1440, 'height': 2600})
    page.screenshot(path=OUT + 'admin-overview-full.png')
    page.set_viewport_size({'width': 1440, 'height': 900})
    page.click('button[aria-label="Switch to dark mode"]')
    page.wait_for_timeout(250)
    page.screenshot(path=OUT + 'admin-overview-dark.png')

    for width in [320, 375, 768, 1024, 1280, 1440]:
        page.set_viewport_size({'width': width, 'height': 800})
        page.wait_for_timeout(120)
        page.screenshot(path=OUT + f'admin-overview-{width}.png')
        print(f'{width}px overflow:', page.evaluate('document.documentElement.scrollWidth > window.innerWidth'))

    print('console errors:', errors)
    browser.close()
