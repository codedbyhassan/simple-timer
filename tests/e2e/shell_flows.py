import sys
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:5199'
OUT = '/home/claude/shots/'
results = []

ROLE_LABELS = {
    'receptionist': 'Receptionist',
    'records_officer': 'Records officer',
    'triage_nurse': 'Triage nurse',
    'ward_nurse': 'Ward nurse',
    'doctor': 'Doctor',
    'lab_technician': 'Laboratory technician',
    'pharmacist': 'Pharmacist',
    'pharmacy_assistant': 'Pharmacy assistant',
    'store_keeper': 'Store keeper',
    'bed_manager': 'Bed manager',
    'cashier': 'Cashier',
    'finance_officer': 'Finance officer',
    'claims_officer': 'Claims officer',
    'hospital_admin': 'Hospital administrator',
    'management_viewer': 'Management viewer',
}

def check(name, condition, detail=''):
    results.append((name, bool(condition), detail))
    print(('PASS' if condition else 'FAIL'), name, detail)

def login(page, role):
    page.goto(f'{BASE}/signin')
    page.wait_for_selector('#local-profile')
    expected = ROLE_LABELS[role]
    option = next(
        item for item in page.locator('#local-profile option').all()
        if item.inner_text().startswith(expected)
    )
    page.select_option('#local-profile', value=option.get_attribute('value'))
    page.click('button[type=submit]')
    page.wait_for_selector('.hms-shell', timeout=8000)

def logout(page):
    page.click('button[aria-label="Account menu"]')
    page.click('[role=menuitem]:has-text("Log out")')
    page.wait_for_url('**/signin')

def nav_labels(page):
    return [text.strip() for text in page.locator('.hms-rail__item').all_inner_texts()]

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    context = browser.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='light')
    page = context.new_page()
    errors = []
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    page.on('pageerror', lambda error: errors.append(str(error)))

    expected = {
        'receptionist': ('/reception/overview', ['Overview', 'Reception desk', 'Appointments', 'Patients', 'Documents', 'OPD queue', 'Claim data gaps', 'Payment status']),
        'triage_nurse': ('/nurse/overview', ['Overview', 'Triage queue', 'Ward and bed board', 'Nursing tasks', 'Admission requests', 'Discharge checklist', 'OPD queue']),
        'doctor': ('/doctor/overview', ['Overview', 'My queue', 'Consultation', 'Results inbox', 'My admissions', 'OPD queue']),
        'lab_technician': ('/lab/overview', ['Overview', 'Worklist', 'Specimens', 'Result entry and verification', 'Critical results', 'Test catalogue', 'Inventory']),
        'pharmacist': ('/pharmacy/overview', ['Overview', 'Prescription queue', 'Dispensing panel', 'Stock alerts', 'Stock levels', 'Formulary mapping flags', 'Inventory']),
        'cashier': ('/cashier/overview', ['Overview', 'Pending charges', 'Payment panel and receipts', 'My till and shift', 'Refunds', 'Shift reconciliation', 'Price list', 'Billed vs claimed']),
        'claims_officer': ('/claims/overview', ['Overview', 'Pipeline', 'Claims list and detail', 'Mapping queue', 'Export batches', 'Import reports', 'Month progress']),
        'hospital_admin': ('/admin/overview', ['Management dashboard', 'Hospital profile', 'Departments, wards, beds', 'Local role profiles', 'Service catalogue and prices', 'Reference mappings', 'Operating settings', 'Reports', 'Refund approvals', 'Inventory console', 'Local activity history', 'Backup and restore']),
        'management_viewer': ('/admin/overview', ['Management dashboard', 'Reports']),
    }

    for role, (home, labels) in expected.items():
        login(page, role)
        page.wait_for_url(f'**{home}')
        actual = nav_labels(page)
        check(f'{role}: opens its workspace', page.url.endswith(home), page.url)
        check(f'{role}: navigation matches role permissions', actual == labels, str(actual))
        logout(page)

    login(page, 'hospital_admin')
    page.wait_for_url('**/admin/overview')
    check('document title is Ascend HMS', page.title() == 'Ascend HMS')
    check('dashboard has one page heading', page.locator('h1:has-text("Management dashboard")').count() == 1)
    check('dashboard uses its actual description', page.get_by_text('The hospital-wide management overview.').is_visible())
    check('single-role profile has no workspace switcher', page.locator('.hms-switch').count() == 0)
    check('rail identifies administration', page.locator('.hms-rail__label').inner_text().strip().lower() == 'administration')
    page.screenshot(path=OUT + 'shell-admin-light.png')

    page.goto(BASE + '/doctor/queue')
    page.wait_for_selector('text=You do not have access to this page')
    check('direct URL to another role is denied', True)
    page.goto(BASE + '/')
    page.wait_for_url('**/admin/overview')
    check('root route resolves to the selected profile home', True)

    page.goto(BASE + '/search?q=not-a-real-record')
    page.wait_for_selector('h1:has-text("Search records")')
    check('global search opens the local record search page', True)
    check('search does not fabricate a matching patient', page.get_by_text('No matching records').count() == 1)

    page.click('button[aria-label="Account menu"]')
    page.wait_for_selector('[role=menu]')
    items = [text.strip() for text in page.locator('[role=menuitem]').all_inner_texts()]
    check('account menu has only working destinations', items == ['Settings', 'Profile', 'Log out'], str(items))
    page.keyboard.press('Escape')
    page.click('button[aria-label="Account menu"]')
    page.click('[role=menuitem]:has-text("Profile")')
    page.wait_for_url('**/profile')
    check('profile clearly identifies local access mode', page.get_by_text('Profiles and permissions are stored in IndexedDB on this device.').is_visible())
    page.click('button:has-text("Switch role profile")')
    page.wait_for_url('**/signin')
    check('switching profile returns to the local profile selector', page.locator('#local-profile').count() == 1)

    login(page, 'hospital_admin')
    page.wait_for_url('**/admin/overview')
    page.click('button[aria-label="Account menu"]')
    page.click('[role=menuitem]:has-text("Settings")')
    page.wait_for_url('**/settings')
    page.click('label:has-text("Dark")')
    page.wait_for_timeout(150)
    check('settings changes the application theme', page.evaluate("document.documentElement.dataset.theme") == 'dark')
    check('top bar toggle reflects dark mode', page.locator('button[aria-label="Switch to light mode"]').count() == 1)
    page.click('button[aria-label="Switch to light mode"]')
    page.wait_for_timeout(150)
    check('top bar toggle returns to light mode', page.evaluate("document.documentElement.dataset.theme") == 'light')

    page.click('button[aria-label^="Notifications"]')
    page.wait_for_selector('text=You are up to date.')
    check('new local installation has no fabricated notifications', True)
    page.keyboard.press('Escape')
    page.evaluate("""() => {
      window.__hmsNotify({tier:'important',title:'Local test event',message:'This notification is stored in IndexedDB.'});
    }""")
    page.wait_for_selector('.hms-bell__count')
    page.reload()
    page.wait_for_selector('.hms-shell')
    page.click('button[aria-label="Notifications"]')
    page.wait_for_selector('text=Local test event')
    check('notifications persist after reload through IndexedDB', True)
    page.keyboard.press('Escape')

    page.click('button[aria-label="Collapse sidebar"]')
    page.wait_for_timeout(200)
    width = page.locator('.hms-rail').bounding_box()['width']
    check('sidebar collapses to compact width', abs(width - 76) < 3, f'{width:.0f}px')
    page.reload()
    page.wait_for_selector('.hms-shell')
    check('sidebar preference survives reload', 'is-compact' in page.get_attribute('.hms-shell', 'class'))
    page.click('button[aria-label="Expand sidebar"]')

    page.keyboard.press('/')
    check('slash shortcut focuses global search', page.evaluate("document.activeElement.name") == 'q')
    page.keyboard.press('Escape')

    check('there is no misleading online status indicator', page.locator('.hms-conn').count() == 0 and page.get_by_text('Online', exact=True).count() == 0)
    context.set_offline(True)
    page.wait_for_timeout(300)
    check('local workflows remain available without a network connection', page.locator('.hms-shell').is_visible())
    check('offline mode does not claim a remote refresh', page.get_by_text('Back online—screens are refreshing').count() == 0)
    context.set_offline(False)

    for width in [320, 375, 680, 768, 1024, 1280, 1440, 1920]:
        page.set_viewport_size({'width': width, 'height': 800})
        page.wait_for_timeout(100)
        no_overflow = page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        check(f'no page-level horizontal overflow at {width}px', no_overflow, f'viewport={width}, document={page.evaluate("document.documentElement.scrollWidth")}')

    logout(page)
    login(page, 'lab_technician')
    page.wait_for_url('**/lab/overview')
    check('changing local profile opens the selected role', page.locator('.hms-rail__label').inner_text().strip().lower() == 'laboratory')
    check('single-role local profile cannot switch into another role', page.locator('.hms-switch').count() == 0)
    check('lab profile sees its own worklist', 'Worklist' in nav_labels(page) and 'My queue' not in nav_labels(page))

    check('no browser console or runtime errors', not errors, '; '.join(errors)[:400])
    browser.close()

failed = [result for result in results if not result[1]]
print(f'\n{len(results) - len(failed)}/{len(results)} checks passed')
sys.exit(1 if failed else 0)
