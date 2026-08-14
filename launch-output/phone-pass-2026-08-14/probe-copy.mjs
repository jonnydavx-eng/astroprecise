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
  await page.goto(BASE + path + '?nosw=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1600);
  const copy = await page.evaluate(() => {
    const interesting = [];
    document.querySelectorAll('p, .ap-live-copy, .standfirst, .lede, li, .ap-shop-copy, .ap-eclipse-copy').forEach(el => {
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (t.length < 40) return;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      interesting.push({ tag: el.tagName, cls: String(el.className).slice(0,50), size: parseFloat(st.fontSize), t: t.slice(0,70) });
    });
    interesting.sort((a,b) => a.size - b.size);
    return interesting.slice(0, 8);
  });
  let drawer = null;
  const toggle = page.locator('.navbar__toggle');
  if (await toggle.count()) {
    await toggle.first().click();
    await page.waitForTimeout(400);
    drawer = await page.evaluate(() => {
      const menu = document.getElementById('nav-mobile-menu');
      if (!menu) return { missing: true };
      const st = getComputedStyle(menu);
      const links = Array.from(menu.querySelectorAll('a.navbar__link')).map(a => {
        const r = a.getBoundingClientRect();
        return { text: a.textContent.replace(/\s+/g,' ').trim(), w: Math.round(r.width), h: Math.round(r.height), href: a.getAttribute('href') };
      });
      return {
        open: menu.classList.contains('open') || menu.getAttribute('aria-hidden') === 'false',
        display: st.display,
        vis: st.visibility,
        links,
        minH: links.length ? Math.min(...links.map(l => l.h)) : 0,
      };
    });
  }
  const extra = await page.evaluate(() => {
    const invite = document.getElementById('compat-invite-btn');
    const ir = invite ? invite.getBoundingClientRect() : null;
    const ics = invite ? getComputedStyle(invite) : null;
    return {
      invite: invite ? { w: Math.round(ir.width), h: Math.round(ir.height), disabled: invite.disabled, text: invite.textContent.trim(), bg: ics.backgroundColor } : null,
      inputs: Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=range]), textarea, select')).map(el => {
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        return { name: el.name || el.id, type: el.type, w: Math.round(r.width), h: Math.round(r.height), fs: parseFloat(st.fontSize), display: st.display };
      }).filter(i => i.display !== 'none' && i.h > 0).slice(0, 12),
    };
  });
  console.log('\n====', path, '====');
  console.log('COPY', JSON.stringify(copy, null, 0));
  console.log('DRAWER', JSON.stringify(drawer, null, 0));
  console.log('EXTRA', JSON.stringify(extra, null, 0));
  await ctx.close();
}
await browser.close();
