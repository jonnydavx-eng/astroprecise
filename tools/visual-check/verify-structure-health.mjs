import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8790';
const pages = [
  '/chart.html',
  '/mysky.html',
  '/horoscope.html',
  '/shop.html',
  '/moment.html',
  '/aries.html',
  '/ephemeris.html',
  '/',
];

const browser = await chromium.launch({ headless: true });
for (const path of pages) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(path === '/' ? 2500 : 1800);
  const d = await page.evaluate(() => {
    const header = document.querySelector('.site-header, header.masthead');
    const h1 = document.querySelector('h1');
    const ev = document.getElementById('ap-engine-visuals');
    const hr = header ? header.getBoundingClientRect() : { bottom: 0 };
    const h1r = h1 ? h1.getBoundingClientRect() : null;
    const threeMin = !!document.querySelector('script[src*="three.min"]');
    const importmap = !!document.querySelector('script[type="importmap"]');
    return {
      path: location.pathname,
      h1Clear: h1r ? h1r.top >= hr.bottom - 1 : null,
      h1Top: h1r ? Math.round(h1r.top) : null,
      headerBottom: Math.round(hr.bottom),
      evOk: !!(ev && ev.offsetHeight > 80),
      evLast: !!(ev && ev.parentElement && ev.parentElement.lastElementChild === ev),
      dualThree: threeMin && importmap,
      cards: document.querySelectorAll('#ap-engine-visuals .ap-ev-rail a').length,
      journey: !!document.getElementById('ap-journey'),
      Orrery3D: typeof window.Orrery3D,
    };
  });
  console.log(JSON.stringify(d));
  await page.close();
}
await browser.close();
