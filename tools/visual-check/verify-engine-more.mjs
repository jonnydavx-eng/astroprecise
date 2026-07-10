import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8790';
const pages = [
  'moment.html',
  'compatibility.html',
  'transits.html',
  'guides.html',
  'quiz.html',
  'moonphase.html',
  'explore.html',
  'sample-reading.html',
  'leo.html',
  'pisces.html',
  'tonight.html',
  'profile.html',
];

const browser = await chromium.launch({ headless: true });
for (const f of pages) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  try {
    await page.goto(BASE + '/' + f, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const d = await page.evaluate(() => ({
      cards: document.querySelectorAll('.ap-ev-rail a').length,
      block: !!document.querySelector('.ap-ev'),
      threeMin: !!document.querySelector('script[src*="three.min"]'),
      importmap: !!document.querySelector('script[type="importmap"]'),
    }));
    d.dual = d.threeMin && d.importmap;
    console.log(f, JSON.stringify(d), 'errs', errs.length);
  } catch (e) {
    console.log(f, 'FAIL', String(e));
  }
  await page.close();
}
await browser.close();
