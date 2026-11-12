from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:5199'; OUT='/home/claude/shots/'
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1440,'height':900}, color_scheme='light')
    pg=ctx.new_page(); errs=[]
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE+'/signin'); pg.wait_for_selector('#local-profile')
    option = next(item for item in pg.locator('#local-profile option').all() if item.inner_text().startswith('Hospital administrator'))
    pg.select_option('#local-profile', value=option.get_attribute('value')); pg.click('button[type=submit]')
    pg.wait_for_selector('.hms-shell'); pg.goto(BASE+'/design-system'); pg.wait_for_selector('.hms-receipt'); pg.wait_for_timeout(900)
    fonts=pg.evaluate("document.fonts.ready.then(()=>[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight))")
    print('loaded fonts:', sorted(set(fonts)))
    print('body font:', pg.evaluate("getComputedStyle(document.body).fontFamily")[:60], '| h1 font:', pg.evaluate("getComputedStyle(document.querySelector('h1')).fontFamily")[:50])
    print('max weight in use:', pg.evaluate("Math.max(...[...document.querySelectorAll('*')].map(e=>+getComputedStyle(e).fontWeight||0))"))
    print('h1 size:', pg.evaluate("getComputedStyle(document.querySelector('h1')).fontSize"), 'body size:', pg.evaluate("getComputedStyle(document.body).fontSize"))
    pg.screenshot(path=OUT+'gallery-top-light.png')
    pg.set_viewport_size({'width':1440,'height':3500}); pg.wait_for_timeout(500); pg.screenshot(path=OUT+'gallery-full-light.png'); pg.set_viewport_size({'width':1440,'height':900})
    for name,sel in [('metrics','text=Key figures'),('charts','text=Charts'),('patients','text=Patient cards'),('receipt','.hms-receipt'),('documents','text=Documents >> nth=0')]:
        pass
    pg.locator('.hms-receipt-wrap').screenshot(path=OUT+'receipt-light.png')
    pg.click('button[aria-label="Switch to dark mode"]'); pg.wait_for_timeout(300)
    pg.set_viewport_size({'width':1440,'height':3500}); pg.wait_for_timeout(500); pg.screenshot(path=OUT+'gallery-full-dark.png'); pg.set_viewport_size({'width':1440,'height':900})
    pg.locator('.hms-receipt-wrap').screenshot(path=OUT+'receipt-dark.png')
    print('console errors:', errs)
    b.close()
