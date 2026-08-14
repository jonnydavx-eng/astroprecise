import { chromium } from '../../tools/visual-check/node_modules/playwright/index.mjs';
const BASE = 'http://127.0.0.1:8790';
async function launch() {
  try { return await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] }); }
  catch (e) { return chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] }); }
}
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(BASE + '/chart.html?nosw=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(800);
const r = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, missing: true };
    return { sel, size: +parseFloat(getComputedStyle(el).fontSize).toFixed(2), t: (el.innerText||'').replace(/\s+/g,' ').trim().slice(0,50) };
  };
  return [
    pick('h1.chart-hero__title'),
    pick('.chart-hero__subtitle'),
    pick('.chart-hero__eyebrow'),
    pick('.chart-hero__timecode'),
    pick('.form-hint'),
  ];
});
console.log(JSON.stringify(r, null, 2));
await ctx.close();
await browser.close();
