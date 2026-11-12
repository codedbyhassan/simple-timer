import re, sys
from playwright.sync_api import sync_playwright, expect
BASE='http://127.0.0.1:5199'
OUT='/home/claude/shots/'
results=[]
def check(name, cond, detail=''):
    results.append((name,bool(cond),detail)); print(('PASS' if cond else 'FAIL'), name, detail)

with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':1440,'height':900}, color_scheme='light')
    pg=ctx.new_page()
    errors=[]
    pg.on('console', lambda m: errors.append(m.text) if m.type=='error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))

    # 1. unauthenticated visit to / redirects to /signin
    pg.goto(BASE+'/'); pg.wait_for_url('**/signin')
    check('protected route redirects to sign in', pg.url.endswith('/signin'))
    check('tab title', pg.title()=='Ascend HMS', pg.title())
    pg.wait_for_selector('input[name=email]'); pg.wait_for_timeout(300)
    check('email field autofocused', pg.evaluate("document.activeElement && document.activeElement.name")=='email')
    pg.screenshot(path=OUT+'signin-light.png')

    # 2. empty submit shows field errors and focuses email
    pg.click('button[type=submit]')
    check('empty submit: email error', pg.get_by_text('Enter your email address.').is_visible())
    check('empty submit: password error', pg.get_by_text('Enter your password.').is_visible())
    check('empty submit: focus on email', pg.evaluate("document.activeElement.name")=='email')
    pg.screenshot(path=OUT+'signin-validation.png')

    # 3. invalid email format
    pg.fill('input[name=email]','not-an-email'); pg.fill('input[name=password]','x')
    pg.click('button[type=submit]')
    check('invalid email message', pg.get_by_text('Enter a valid email address.').is_visible())

    # 4. wrong credentials -> error toast at the top, password cleared + focused
    pg.fill('input[name=email]','demo@ascend.test'); pg.fill('input[name=password]','wrong-password')
    pg.click('button[type=submit]')
    toast=pg.locator('.hms-toast--error')
    toast.wait_for(timeout=4000)
    box=toast.bounding_box()
    check('error toast visible', toast.is_visible())
    check('toast is at the top of the viewport', box['y']<40, f"y={box['y']:.0f}")
    check('toast is horizontally centered', abs((box['x']+box['width']/2)-720)<2, f"cx={box['x']+box['width']/2:.0f}")
    check('toast text', 'The email or password is incorrect.' in toast.inner_text())
    check('password cleared and focused', pg.input_value('input[name=password]')=='' and pg.evaluate("document.activeElement.name")=='password')
    pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+'signin-error-toast.png')

    # 5. toast dismiss button
    pg.click('.hms-toast--error button[aria-label="Dismiss notification"]')
    pg.wait_for_selector('.hms-toast--error', state='detached', timeout=2000)
    check('toast dismiss works', True)

    # 6. show/hide password
    pg.fill('input[name=password]','secret')
    check('password hidden by default', pg.get_attribute('input[name=password]','type')=='password')
    pg.click('button[aria-label="Show password"]')
    check('password revealed', pg.get_attribute('input[name=password]','type')=='text')
    pg.click('button[aria-label="Hide password"]')

    # 7. rate limited + offline wording
    for em,txt in [('limited@ascend.test','Wait a minute, then try again.'),('offline@ascend.test','server could not be reached'),('disabled@ascend.test','This account is turned off.')]:
        pg.fill('input[name=email]',em); pg.fill('input[name=password]','whatever'); pg.click('button[type=submit]')
        pg.wait_for_selector('.hms-toast--error', timeout=4000)
        check(f'wording for {em}', txt in pg.locator('.hms-toast--error').first.inner_text())
        pg.evaluate("window.__hmsToast.dismiss && 0"); pg.click('.hms-toast--error button[aria-label="Dismiss notification"]'); pg.wait_for_selector('.hms-toast--error', state='detached')

    # 8. keyboard: Enter submits, valid login lands on app
    pg.fill('input[name=email]','demo@ascend.test'); pg.fill('input[name=password]','Ascend#2026')
    pg.press('input[name=password]','Enter')
    pg.wait_for_selector('.hms-shell', timeout=6000)
    check('valid sign in reaches the app shell', pg.url.endswith('/admin/overview'), pg.url)
    # 9. reload keeps session; visiting /signin bounces back
    pg.reload(); pg.wait_for_selector('.hms-shell')
    pg.goto(BASE+'/signin'); pg.wait_for_selector('.hms-shell'); pg.wait_for_url('**/admin/overview')
    check('session persists across reload and guest pages redirect', True)
    pg.click('button[aria-label="Account menu"]'); pg.click('[role=menuitem]:has-text("Log out")'); pg.wait_for_url('**/signin')
    check('sign out returns to sign in', True)

    # 10. forgot password
    pg.click('text=Forgot password?'); pg.wait_for_url('**/forgot-password')
    pg.wait_for_timeout(250); pg.screenshot(path=OUT+'forgot.png')
    pg.click('button[type=submit]')
    check('forgot: empty email error', pg.get_by_text('Enter your email address.').is_visible())
    pg.fill('input[name=email]','amma.owusu@hospital.com'); pg.click('button[type=submit]')
    pg.wait_for_selector('text=Check your email', timeout=4000)
    check('forgot: confirmation shows address', pg.get_by_text('amma.owusu@hospital.com').first.is_visible())
    check('forgot: success toast', pg.locator('.hms-toast--success').first.is_visible())
    check('forgot: resend is locked during cooldown', pg.locator('button:has-text("Send again in")').is_disabled())
    pg.wait_for_timeout(500); pg.screenshot(path=OUT+'forgot-sent.png')
    pg.click('text=Back to sign in'); pg.wait_for_url('**/signin')

    # 11. reset password (valid link)
    pg.goto(BASE+'/reset-password'); pg.wait_for_selector('input[name=new-password]', timeout=4000)
    pg.fill('input[name=new-password]','short'); pg.fill('input[name=confirm-password]','short')
    pg.click('button[type=submit]')
    check('reset: too-short password rejected', pg.get_by_text('At least 8 characters are needed.').is_visible())
    pg.fill('input[name=new-password]','LongEnough1'); pg.fill('input[name=confirm-password]','Different1')
    pg.click('button[type=submit]')
    check('reset: mismatch rejected', pg.get_by_text('The two passwords do not match.').is_visible())
    pg.fill('input[name=confirm-password]','LongEnough1')
    check('reset: checklist all met', pg.locator('.hms-reqs__item.is-met').count()==2)
    pg.wait_for_timeout(250); pg.screenshot(path=OUT+'reset-form.png')
    pg.fill('input[name=new-password]','Ascend#2026'); pg.fill('input[name=confirm-password]','Ascend#2026'); pg.click('button[type=submit]')
    pg.wait_for_selector('.hms-field__error:has-text("different from your current")', timeout=4000)
    check('reset: same-password message', True)
    pg.fill('input[name=new-password]','LongEnough1'); pg.fill('input[name=confirm-password]','LongEnough1'); pg.click('button[type=submit]')
    pg.wait_for_url('**/signin', timeout=5000)
    t=pg.locator('.hms-toast--success'); t.wait_for(timeout=3000)
    check('reset: success toast after redirect', 'Password updated' in t.inner_text())
    pg.wait_for_timeout(400); pg.screenshot(path=OUT+'reset-success-toast.png')

    # 12. expired link
    pg.goto(BASE+'/reset-password?demo=expired'); pg.wait_for_selector('text=This link has expired', timeout=4000)
    check('expired link screen', True)
    pg.wait_for_timeout(250); pg.screenshot(path=OUT+'reset-expired.png')

    # 13. all four toast tones stacked
    pg.goto(BASE+'/signin'); pg.wait_for_selector('input[name=email]')
    pg.evaluate("""() => { const t = window.__hmsToast;
      t.info({title:'Queue updated', message:'3 patients are waiting for triage.'});
      t.warning({title:'Insurance nearing expiry', message:'Member 11111111 expires in 9 days.'});
      t.error({title:'Could not save', message:'The server did not respond. Your changes are not saved.', action:{label:'Try again'}});
      t.success({title:'Patient registered', message:'ASC-PAT-000124 was created.'}); }""")
    pg.wait_for_timeout(500)
    check('toast stack capped at 3', pg.locator('.hms-toast').count()==3, str(pg.locator('.hms-toast').count()))
    pg.screenshot(path=OUT+'toast-stack.png')
    # toast timer pauses on hover
    first=pg.locator('.hms-toast').first
    first.hover(); pg.wait_for_timeout(200)
    check('timer pauses on hover', first.locator('.hms-toast__timer').evaluate("e=>getComputedStyle(e).animationPlayState")=='paused')

    # 14. tab order on sign in
    pg.goto(BASE+'/signin'); pg.wait_for_selector('input[name=email]')
    order=[]
    for _ in range(7):
        order.append(pg.evaluate("(document.activeElement.name||document.activeElement.getAttribute('aria-label')||document.activeElement.textContent||'').trim()"))
        pg.keyboard.press('Tab')
    print('tab order:',order)
    check('tab order is logical', order[:5]==['email','password','Show password','Forgot password?','Sign in'], str(order[:5]))

    # 15. dark mode
    pg.click('button[aria-label="Switch to dark mode"]'); pg.wait_for_timeout(300)
    check('dark theme applied', pg.evaluate("document.documentElement.dataset.theme")=='dark')
    check('theme persisted', pg.evaluate("localStorage.getItem('hms.theme')")=='dark')
    check('dark page background is black', pg.evaluate("getComputedStyle(document.body).backgroundColor")=='rgb(0, 0, 0)')
    pg.screenshot(path=OUT+'signin-dark.png')
    pg.fill('input[name=email]','demo@ascend.test'); pg.fill('input[name=password]','nope'); pg.click('button[type=submit]')
    pg.wait_for_selector('.hms-toast--error'); pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+'signin-dark-error-toast.png')
    pg.reload(); pg.wait_for_selector('input[name=email]')
    check('dark theme survives reload', pg.evaluate("document.documentElement.dataset.theme")=='dark')
    pg.evaluate("window.__hmsToast.info({title:'Queue updated', message:'3 patients are waiting for triage.'});window.__hmsToast.success({title:'Patient registered', message:'ASC-PAT-000124 was created.'});window.__hmsToast.warning({title:'Insurance nearing expiry', message:'Member 11111111 expires in 9 days.'});")
    pg.wait_for_timeout(500); pg.screenshot(path=OUT+'toast-stack-dark.png')

    check('no console errors', not errors, '; '.join(errors)[:300])
    b.close()
fails=[r for r in results if not r[1]]
print(f'\n{len(results)-len(fails)}/{len(results)} checks passed')
sys.exit(1 if fails else 0)
