import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out', 'user-zero-score');
const BASE = process.argv[2] || 'http://localhost:8790';

const PAGES = [
  ['home', `${BASE}/`],
  ['chart', `${BASE}/chart.html`],
  ['horoscope', `${BASE}/horoscope.html`],
  ['shop', `${BASE}/shop.html`],
  ['aries', `${BASE}/aries.html`],
  ['mysky', `${BASE}/mysky.html`],
  ['ephemeris', `${BASE}/ephemeris.html`],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const [id, url] of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text());
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(id === 'home' ? 3000 : 2200);
  const d = await page.evaluate(() => {
    const threeMin = !!document.querySelector('script[src*="three.min"]');
    const importmap = !!document.querySelector('script[type="importmap"]');
    return {
      dualThree: threeMin && importmap,
      threeMin,
      engineBlock: !!document.querySelector('.ap-ev, [data-engine-visuals-mounted]'),
      engineCards: document.querySelectorAll('.ap-ev-rail a').length,
      cinema: !!document.querySelector('.ap-ev-cinema, .mysky-cinema'),
      Orrery3D: typeof window.Orrery3D,
      journey: !!document.getElementById('ap-journey'),
      multiThreeWarn: false,
    };
  });
  await page.screenshot({ path: join(OUT, `sitewide-${id}.png`), fullPage: false });
  console.log(id, JSON.stringify(d), 'errs', errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
await browser.close();
