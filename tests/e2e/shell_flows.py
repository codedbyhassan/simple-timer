import sys
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:5199'; OUT='/home/claude/shots/'
results=[]
def check(name, cond, detail=''):
    results.append((name,bool(cond),detail)); print(('PASS' if cond else 'FAIL'), name, detail)

def login(pg, role):
    pg.goto(f'{BASE}/signin?as={role}')
    pg.evaluate("localStorage.removeItem('hms.demo.session')")
    pg.goto(f'{BASE}/signin?as={role}'); pg.wait_for_selector('input[name=email]')
    pg.fill('input[name=email]','demo@ascend.test'); pg.fill('input[name=password]','Ascend#2026'); pg.click('button[type=submit]')
    pg.wait_for_selector('.hms-shell', timeout=6000)

def nav_labels(pg):
    return [t.strip() for t in pg.locator('.hms-rail__item').all_inner_texts()]

with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':1440,'height':900}, color_scheme='light')
    pg=ctx.new_page(); errors=[]
    pg.on('console', lambda m: errors.append(m.text) if m.type=='error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))

    # role-based navigation + home
    expect={
      'receptionist':('/reception/overview',['Overview','Reception desk','Appointments','Patients','Documents','OPD queue','Claim data gaps','Payment status']),
      'triage_nurse':('/nurse/overview',['Overview','Triage queue','Ward and bed board','Nursing tasks','Admission requests','Discharge checklist','OPD queue']),
      'doctor':('/doctor/overview',['Overview','My queue','Consultation','Results inbox','My admissions','OPD queue']),
      'lab_technician':('/lab/overview',['Overview','Worklist','Specimens','Result entry and verification','Critical results','Test catalogue','Inventory']),
      'pharmacist':('/pharmacy/overview',['Overview','Prescription queue','Dispensing panel','Stock alerts','Stock levels','Formulary mapping flags','Inventory']),
      'cashier':('/cashier/overview',['Overview','Pending charges','Payment panel and receipts','My till and shift','Refunds','Shift reconciliation','Price list','Billed vs claimed']),
      'claims_officer':('/claims/overview',['Overview','Pipeline','Claims list and detail','Mapping queue','Export batches','Import reports','Month progress']),
      'hospital_admin':('/admin/overview',['Management dashboard','Hospital profile','Departments, wards, beds','Users, roles, permissions','Service catalogue and prices','Reference mappings','Thresholds and settings','Reports','Refund approvals','Inventory console','Audit viewer','Sync conflicts','Realtime SLA monitor','Backup status']),
      'management_viewer':('/admin/overview',['Management dashboard','Reports']),
    }
    for role,(home,labels) in expect.items():
        login(pg, role); pg.wait_for_url('**'+home)
        got=nav_labels(pg)
        check(f'{role}: lands on {home}', pg.url.endswith(home), pg.url)
        check(f'{role}: sees exactly its dashboards', got==labels, str(got))
        pg.click('button[aria-label="Account menu"]'); pg.click('[role=menuitem]:has-text("Log out")'); pg.wait_for_url('**/signin')

    # admin deep dive
    login(pg,'hospital_admin'); pg.wait_for_url('**/admin/overview'); pg.wait_for_timeout(300)
    check('tab title stays Ascend HMS', pg.title()=='Ascend HMS')
    check('page heading is shown once', pg.locator('h1:has-text("Management dashboard")').count()==1)
    check('menu description from the brief is shown', pg.get_by_text('The hospital-wide management overview.').is_visible())
    check('single-role user has no workspace switcher', pg.locator('.hms-switch').count()==0)
    check('rail names the workspace', pg.locator('.hms-rail__label').inner_text().strip().lower()=='administration')
    pg.screenshot(path=OUT+'shell-admin-light.png')

    # URL guard: admin typing a doctor URL gets the no-access page
    pg.goto(BASE+'/doctor/queue'); pg.wait_for_selector('text=You do not have access to this page')
    check('direct URL to a forbidden dashboard shows no-access', True)
    pg.screenshot(path=OUT+'shell-no-access.png')
    pg.goto(BASE+'/'); pg.wait_for_url('**/admin/overview')
    check('root redirects to the role home', True)
    pg.goto(BASE+'/admin'); pg.wait_for_url('**/admin/overview'); check('workspace root redirects to its overview', True)
    pg.fill('input[name=q]','ASC-PAT-000124'); pg.press('input[name=q]','Enter'); pg.wait_for_url('**/search?q=ASC-PAT-000124')
    pg.wait_for_selector('text=Patients, appointments, laboratory orders, prescriptions and claims.'); check('global search goes to the shared search page', True)
    pg.goto(BASE+'/design-system'); pg.wait_for_selector('.hms-receipt'); check('admin can open the design system page', True)
    pg.goto(BASE+'/admin/overview'); pg.wait_for_selector('h1')

    # avatar dropdown contents + keyboard
    pg.click('button[aria-label="Account menu"]'); pg.wait_for_selector('[role=menu]')
    items=[t.strip() for t in pg.locator('[role=menuitem]').all_inner_texts()]
    check('avatar menu items', items==['Settings','Profile','Log out'], str(items))
    check('first item focused on open', pg.evaluate("document.activeElement.textContent.trim()")=='Settings')
    pg.keyboard.press('ArrowDown'); check('arrow down moves focus', pg.evaluate("document.activeElement.textContent.trim()")=='Profile')
    pg.keyboard.press('ArrowUp'); pg.keyboard.press('ArrowUp'); check('arrow up wraps to last', pg.evaluate("document.activeElement.textContent.trim()")=='Log out')
    pg.screenshot(path=OUT+'shell-avatar-menu.png')
    pg.keyboard.press('Escape'); pg.wait_for_selector('[role=menu]', state='detached')
    check('Escape closes menu and returns focus to the avatar', pg.evaluate("document.activeElement.getAttribute('aria-label')")=='Account menu')
    pg.click('button[aria-label="Account menu"]'); pg.mouse.click(700,500)
    pg.wait_for_selector('[role=menu]', state='detached'); check('outside click closes menu', True)

    # profile + settings via menu
    pg.click('button[aria-label="Account menu"]'); pg.click('[role=menuitem]:has-text("Profile")'); pg.wait_for_url('**/profile')
    pg.wait_for_selector('.hms-status:has-text("Hospital administrator")', timeout=4000); check('menu opens Profile', True)
    pg.wait_for_timeout(250); pg.screenshot(path=OUT+'shell-profile.png')
    pg.click('button:has-text("Send reset link")'); pg.wait_for_selector('.hms-toast--success'); check('profile reset link toast', True)
    pg.click('button[aria-label="Account menu"]'); pg.click('[role=menuitem]:has-text("Settings")'); pg.wait_for_url('**/settings')

    # theme: settings control and top bar toggle stay in sync
    pg.click('label:has-text("Dark")'); pg.wait_for_timeout(200)
    check('settings control switches to dark', pg.evaluate("document.documentElement.dataset.theme")=='dark')
    check('toggle icon reflects dark', pg.locator('button[aria-label="Switch to light mode"]').count()==1)
    pg.screenshot(path=OUT+'shell-settings-dark.png')
    pg.click('button[aria-label="Switch to light mode"]'); pg.wait_for_timeout(200)
    check('top bar toggle returns to light', pg.evaluate("document.documentElement.dataset.theme")=='light')
    check('settings radio follows', pg.locator('input[value=light]').is_checked())

    # notifications
    check('no unread badge initially', pg.locator('.hms-count').count()==0)
    pg.click('button[aria-label="Notifications"]'); pg.wait_for_selector('text=You are up to date.')
    check('empty notification state', True); pg.screenshot(path=OUT+'shell-notifications-empty.png')
    pg.keyboard.press('Escape')
    pg.evaluate("""() => { window.__hmsNotify({tier:'important',title:'Result ready',message:'Lab results for ASC-PAT-000124 were verified.',target:'/profile'});
      window.__hmsNotify({tier:'important',title:'Stock below minimum',message:'Artesunate 50 mg is under its minimum level.'}); }""")
    pg.wait_for_timeout(500)
    check('important notification shows a quiet toast', pg.locator('.hms-toast--info').count()>=1)
    check('unread badge shows 2', pg.locator('.hms-count').inner_text()=='2')
    pg.evaluate("window.__hmsNotify({tier:'critical',title:'Critical lab value',message:'Potassium 6.9 mmol/L for ASC-PAT-000124.'})")
    pg.wait_for_selector('.hms-critical'); check('critical strip appears', pg.locator('.hms-critical').is_visible())
    check('critical raises no toast', pg.locator('.hms-toast--info').count()<=2)
    pg.wait_for_timeout(300); pg.screenshot(path=OUT+'shell-critical-strip.png')
    pg.click('button[aria-label^="Notifications"]'); pg.wait_for_selector('.hms-notes__list')
    pg.wait_for_timeout(200); pg.screenshot(path=OUT+'shell-notifications-list.png')
    pg.locator('.hms-note__ack').click(); pg.wait_for_selector('.hms-critical', state='detached')
    check('acknowledging removes the critical strip', True)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    check('opening the list marks everything read', pg.locator('.hms-count').count()==0)

    # sidebar collapse
    pg.click('button[aria-label="Collapse sidebar"]'); pg.wait_for_timeout(250)
    w=pg.locator('.hms-rail').bounding_box()['width']
    check('rail collapses to compact width', abs(w-76)<2, f'{w:.0f}px')
    check('compact items keep accessible names', pg.locator('.hms-rail__item[aria-label="Hospital profile"]').count()==1)
    pg.screenshot(path=OUT+'shell-compact.png')
    pg.reload(); pg.wait_for_selector('.hms-shell')
    check('collapse state persists', 'is-compact' in pg.get_attribute('.hms-shell','class'))
    pg.click('button[aria-label="Expand sidebar"]')

    # search shortcut
    pg.keyboard.press('/')
    check('"/" focuses search', pg.evaluate("document.activeElement.name")=='q')
    pg.keyboard.press('Escape'); pg.mouse.click(700,500)

    # search field: centred, iOS look and behaviour
    f=pg.locator('.hms-search__field').bounding_box(); m=pg.locator('.hms-shell__main').bounding_box()
    cx=f['x']+f['width']/2; mx=m['x']+m['width']/2
    check('search is centred in the header', abs(cx-mx)<=1.5, f'search {cx:.1f} vs header {mx:.1f}')
    st=pg.evaluate("(()=>{const s=getComputedStyle(document.querySelector('.hms-search__field')); return [s.borderTopWidth,s.borderRadius,s.backgroundColor,s.height]})()")
    check('search has no border, 10px radius, translucent grey fill, 36px tall', st[0]=='0px' and st[1]=='10px' and st[2].startswith('rgba(118, 118, 128') and st[3]=='36px', str(st))
    check('placeholder is the iOS word', pg.get_attribute('input[name=q]','placeholder')=='Search')
    check('accessible name says what it searches', 'patients' in pg.get_attribute('input[name=q]','aria-label'))
    check('no clear button or Cancel while idle', pg.locator('.hms-search__clear').count()==0 and pg.locator('.hms-search__cancel').evaluate("e=>getComputedStyle(e).opacity")=='0')
    pg.click('input[name=q]'); pg.wait_for_timeout(300)
    check('Cancel appears on focus', pg.locator('.hms-search__cancel').evaluate("e=>getComputedStyle(e).opacity")=='1')
    f2=pg.locator('.hms-search__field').bounding_box(); check('focusing does not move the field', abs(f2['x']-f['x'])<0.5 and abs(f2['width']-f['width'])<0.5)
    pg.fill('input[name=q]','ama'); check('clear button appears while typing', pg.locator('.hms-search__clear').count()==1)
    pg.screenshot(path=OUT+'shell-search-focused.png', clip={'x':380,'y':0,'width':760,'height':70})
    pg.click('.hms-search__clear'); check('clear empties the field and keeps focus', pg.input_value('input[name=q]')=='' and pg.evaluate("document.activeElement.name")=='q')
    pg.fill('input[name=q]','kofi'); pg.keyboard.press('Escape'); check('Escape clears first', pg.input_value('input[name=q]')=='')
    pg.fill('input[name=q]','kofi'); pg.click('.hms-search__cancel'); pg.wait_for_timeout(250)
    check('Cancel clears and leaves the field', pg.input_value('input[name=q]')=='' and pg.evaluate("document.activeElement.name")!='q')
    u=pg.url; pg.click('input[name=q]'); pg.press('input[name=q]','Enter'); pg.wait_for_timeout(250)
    check('an empty search does not navigate', pg.url==u, pg.url); pg.keyboard.press('Escape'); pg.mouse.click(700,500)

    # no always-on indicator; offline is announced once, recovery is announced once
    check('no connection chip in the header', pg.locator('.hms-conn').count()==0 and pg.get_by_text('Online', exact=True).count()==0)
    ctx.set_offline(True); pg.wait_for_selector('.hms-toast--warning', timeout=3000)
    check('going offline shows a warning toast', 'You are offline' in pg.locator('.hms-toast--warning').first.inner_text())
    pg.wait_for_timeout(300); pg.screenshot(path=OUT+'shell-offline-toast.png')
    ctx.set_offline(False); pg.wait_for_selector('.hms-toast--success:has-text("Back online")', timeout=3000)
    check('coming back shows one success toast', pg.locator('.hms-toast--success:has-text("Back online")').count()==1)
    pg.evaluate("document.querySelectorAll('.hms-toast button[aria-label=\"Dismiss notification\"]').forEach(b=>b.click())"); pg.wait_for_timeout(400)

    # two roles: workspace switcher
    pg.click('button[aria-label="Account menu"]'); pg.click('[role=menuitem]:has-text("Log out")'); pg.wait_for_url('**/signin')
    login(pg,'doctor+lab_technician'); pg.wait_for_url('**/doctor/overview'); pg.wait_for_selector('.hms-switch')
    check('two roles show the workspace switcher', pg.locator('.hms-switch').count()==1)
    pg.click('.hms-switch'); items=[t.strip() for t in pg.locator('[role=menuitem]').all_inner_texts()]
    check('switcher lists both workspaces', items==['Doctor','Laboratory'], str(items))
    rail_box=pg.locator('.hms-rail').bounding_box()
    boxes=[pg.locator('[role=menuitem]').nth(i).bounding_box() for i in range(2)]
    check('switcher menu items are visible and inside the sidebar', all(b and b['x']>=rail_box['x'] and b['x']+b['width']<=rail_box['x']+rail_box['width'] for b in boxes) and pg.locator('[role=menuitem]').first.is_visible(), str(boxes))
    pg.wait_for_timeout(200); pg.screenshot(path=OUT+'shell-switcher.png')
    pg.click('[role=menuitem]:has-text("Laboratory")'); pg.wait_for_url('**/lab/overview'); pg.wait_for_selector('h1:has-text("Overview")'); pg.wait_for_timeout(300)
    check('switching goes to the other workspace home', pg.locator('.hms-rail__label').inner_text().strip().lower()=='laboratory')
    check('lab workspace shows lab menus', 'Worklist' in nav_labels(pg) and 'My queue' not in nav_labels(pg))
    pg.goto(BASE+'/pharmacy/overview'); pg.wait_for_selector('text=You do not have access to this page'); check('a workspace outside the roles is refused', True)
    pg.click('button[aria-label="Account menu"]'); pg.click('[role=menuitem]:has-text("Log out")'); pg.wait_for_url('**/signin')

    # scroll to top on navigation
    login(pg,'doctor'); pg.wait_for_url('**/doctor/overview')
    pg.evaluate("document.getElementById('main').insertAdjacentHTML('beforeend','<div style=\"height:3000px\"></div>')")
    pg.evaluate("document.getElementById('main').scrollTo(0, 1500)"); pg.wait_for_timeout(150)
    check('content is scrolled down', pg.evaluate("document.getElementById('main').scrollTop")>1000)
    # the rail and the header do not move or scroll with it
    rail=pg.locator('.hms-rail').bounding_box(); head=pg.locator('.hms-topbar').bounding_box()
    check('rail stays pinned while content scrolls', rail['y']==0 and abs(rail['height']-900)<=1, str(rail))
    check('header stays pinned while content scrolls', head['y']==0, str(head))
    check('the page itself never scrolls', pg.evaluate("document.documentElement.scrollHeight<=window.innerHeight && window.scrollY===0"))
    check('rail has no scrollbar and is not scrollable', pg.evaluate("(()=>{const e=document.querySelector('.hms-rail'); return e.scrollHeight<=e.clientHeight+1 && getComputedStyle(e).overflowY==='hidden'})()"))
    pg.screenshot(path=OUT+'shell-scrolled-fixed.png')
    pg.click('.hms-rail__item:has-text("Consultation")'); pg.wait_for_url('**/doctor/consultation'); pg.wait_for_timeout(200)
    check('navigation scrolls the content to top', pg.evaluate("document.getElementById('main').scrollTop")==0)
    pg.screenshot(path=OUT+'shell-doctor-light.png')

    # dark theme full shell
    pg.click('button[aria-label="Switch to dark mode"]'); pg.wait_for_timeout(250)
    pg.screenshot(path=OUT+'shell-doctor-dark.png')
    pg.click('button[aria-label="Account menu"]'); pg.wait_for_selector('[role=menu]'); pg.wait_for_timeout(200)
    pg.screenshot(path=OUT+'shell-avatar-menu-dark.png'); pg.keyboard.press('Escape')
    pg.click('button[aria-label="Notifications"]'); pg.wait_for_timeout(250); pg.screenshot(path=OUT+'shell-notifications-dark.png'); pg.keyboard.press('Escape')

    # 1366x768 minimum
    pg.set_viewport_size({'width':1366,'height':768}); pg.wait_for_timeout(200)
    check('no horizontal scroll at 1366x768', pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth"))
    f=pg.locator('.hms-search__field').bounding_box(); m=pg.locator('.hms-shell__main').bounding_box()
    check('search is centred at 1366x768', abs((f['x']+f['width']/2)-(m['x']+m['width']/2))<=1.5)
    pg.screenshot(path=OUT+'shell-1366.png')

    pg.click('button[aria-label="Account menu"]'); pg.click('[role=menuitem]:has-text("Log out")'); pg.wait_for_url('**/signin')
    login(pg,'hospital_admin'); pg.wait_for_url('**/admin/overview'); pg.wait_for_timeout(300)
    fit=pg.evaluate("(()=>{const e=document.querySelector('.hms-rail__scroll'); return [e.scrollHeight,e.clientHeight]})()")
    check('all 14 administration menus fit the rail at 1366x768 with no scrolling', fit[0]<=fit[1]+1, str(fit))
    pg.screenshot(path=OUT+'shell-admin-1366.png')
    login_roles=['doctor+lab_technician']
    pg.click('button[aria-label="Account menu"]'); pg.click('[role=menuitem]:has-text("Log out")'); pg.wait_for_url('**/signin')
    login(pg,'doctor+lab_technician'); pg.wait_for_selector('.hms-switch')
    fit=pg.evaluate("(()=>{const e=document.querySelector('.hms-rail__scroll'); return [e.scrollHeight,e.clientHeight]})()")
    check('switcher plus menus fit at 1366x768', fit[0]<=fit[1]+1, str(fit))

    check('no console errors', not errors, '; '.join(errors)[:300])
    b.close()
fails=[r for r in results if not r[1]]
print(f'\n{len(results)-len(fails)}/{len(results)} checks passed'); sys.exit(1 if fails else 0)
