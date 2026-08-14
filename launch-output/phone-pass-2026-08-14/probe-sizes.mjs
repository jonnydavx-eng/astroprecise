import { chromium } from '../../tools/visual-check/node_modules/playwright/index.mjs';
const BASE = 'http://127.0.0.1:8790';
const PAGES = ['/index.html','/compatibility.html','/chart.html','/tonight.html','/eclipse.html','/shop.html'];
const SELS = [
  'h1','.ap-live-heading','.chart-hero__title',
  '.ap-live-copy','.standfirst','.chart-hero__subtitle','.tn-hero__sub','.ap-shop-lede',
  '.ap-live-eyebrow','.chart-hero__eyebrow','.chart-hero__timecode','.ap-shop-kicker','.ap-eclipse-kicker','.tn-hero__eyebrow',
  '.ap-shop-includes li','.ap-model-hint','.form-hint','.navbar__drawer-heading','.ap-legal-links',
  '.ap-ledger > span','.ap-control-note'
];
async function launch() {
  try { return await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] }); }
  catch (e) { return chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] }); }
}
const browser = await launch();
for (const path of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + path + '?nosw=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(900);
  const rows = await page.evaluate((SELS) => {
    return SELS.map(sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const st = getComputedStyle(el);
      return { sel, size: +parseFloat(st.fontSize).toFixed(2), t: (el.innerText||'').replace(/\s+/g,' ').trim().slice(0,42) };
    }).filter(Boolean);
  }, SELS);
  console.log('\n====', path, '====');
  for (const r of rows) console.log(r.size.toString().padStart(6), r.sel, JSON.stringify(r.t));
  await ctx.close();
}
await browser.close();
