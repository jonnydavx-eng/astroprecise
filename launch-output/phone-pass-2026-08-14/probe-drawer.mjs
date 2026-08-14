import { chromium } from '../../tools/visual-check/node_modules/playwright/index.mjs';
const BASE = 'http://127.0.0.1:8790';
const PAGES = ['/index.html','/compatibility.html','/chart.html','/tonight.html','/eclipse.html','/shop.html'];
async function launch() {
  try { return await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] }); }
  catch (e) { return chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] }); }
}
const browser = await launch();
for (const path of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message||e)));
  await page.goto(BASE + path + '?nosw=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2200);
  const before = await page.evaluate(() => {
    const toggle = document.querySelector('.navbar__toggle');
    const menu = document.getElementById('nav-mobile-menu');
    const header = document.querySelector('.site-header');
    const nav = document.querySelector('.navbar');
    const chain = [];
    let el = menu;
    while (el) {
      const st = getComputedStyle(el);
      chain.push({
        tag: el.tagName + (el.id?('#'+el.id):'') + (el.className && String(el.className).slice ? '.'+String(el.className).split(' ').slice(0,3).join('.') : ''),
        contain: st.contain,
        overflow: st.overflow,
        overflowX: st.overflowX,
        overflowY: st.overflowY,
        pos: st.position,
        z: st.zIndex,
        display: st.display,
        vis: st.visibility,
        h: Math.round(el.getBoundingClientRect().height),
        w: Math.round(el.getBoundingClientRect().width),
      });
      el = el.parentElement;
    }
    const tcs = toggle ? getComputedStyle(toggle) : null;
    const tr = toggle ? toggle.getBoundingClientRect() : null;
    const hit = toggle ? document.elementFromPoint(tr.left + tr.width/2, tr.top + tr.height/2) : null;
    return {
      hasToggle: !!toggle,
      toggleLabel: toggle ? toggle.getAttribute('aria-label') : null,
      toggleExpanded: toggle ? toggle.getAttribute('aria-expanded') : null,
      toggleDisplay: tcs && tcs.display,
      togglePointer: tcs && tcs.pointerEvents,
      toggleZ: tcs && tcs.zIndex,
      hitTag: hit ? hit.tagName + (hit.id?('#'+hit.id):'') + '.' + String(hit.className||'').slice(0,40) : null,
      menuExists: !!menu,
      menuHTML: menu ? menu.innerHTML.slice(0,120) : null,
      menuKids: menu ? menu.children.length : 0,
      menuAria: menu ? menu.getAttribute('aria-hidden') : null,
      menuOpenClass: menu ? menu.classList.contains('open') : null,
      headerContain: header ? getComputedStyle(header).contain : null,
      headerOverflow: header ? getComputedStyle(header).overflow : null,
      navOverflow: nav ? getComputedStyle(nav).overflow : null,
      navModel: !!window.AP_NAV,
      scripts: Array.from(document.scripts).map(s => (s.src||'').split('/').pop()).filter(s => /nav|boot|app|responsive/.test(s)),
      chain,
    };
  });
  const toggle = page.locator('.navbar__toggle').first();
  let clickErr = null;
  if (await toggle.count()) {
    try { await toggle.click({ timeout: 3000 }); }
    catch (e) { clickErr = e.message; }
    await page.waitForTimeout(500);
  }
  const after = await page.evaluate(() => {
    const toggle = document.querySelector('.navbar__toggle');
    const menu = document.getElementById('nav-mobile-menu');
    if (!menu) return { missing: true };
    const st = getComputedStyle(menu);
    const r = menu.getBoundingClientRect();
    const links = Array.from(menu.querySelectorAll('a.navbar__link')).map(a => {
      const br = a.getBoundingClientRect();
      return { text: a.textContent.replace(/\s+/g,' ').trim().slice(0,40), w: Math.round(br.width), h: Math.round(br.height), top: Math.round(br.top) };
    });
    return {
      expanded: toggle ? toggle.getAttribute('aria-expanded') : null,
      openClass: menu.classList.contains('open'),
      ariaHidden: menu.getAttribute('aria-hidden'),
      display: st.display,
      vis: st.visibility,
      pos: st.position,
      inset: [st.top, st.right, st.bottom, st.left].join('/'),
      z: st.zIndex,
      opacity: st.opacity,
      transform: st.transform,
      contain: st.contain,
      w: Math.round(r.width),
      h: Math.round(r.height),
      top: Math.round(r.top),
      left: Math.round(r.left),
      linkCount: links.length,
      visibleLinks: links.filter(l => l.h > 0 && l.w > 0).length,
      firstLinks: links.slice(0, 6),
      minLinkH: links.length ? Math.min(...links.map(l => l.h)) : 0,
      bodyDrawer: document.body.classList.contains('nav-drawer-open'),
    };
  });
  console.log('\n====', path, '====');
  console.log('BEFORE', JSON.stringify(before, null, 0));
  console.log('CLICK', clickErr || 'ok');
  console.log('AFTER', JSON.stringify(after, null, 0));
  if (errors.length) console.log('ERRORS', errors.slice(0,4));
  await ctx.close();
}
await browser.close();
