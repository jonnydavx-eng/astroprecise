/* Wave-2 gates:
 * 1. explore-boot parses #m= / focus= (unit via page evaluate of __apParseModelHash)
 * 2. explore.html applies deep link → data-ap-model-link attribute
 * 3. mounts: dial-model-link, mom-model-link present; weekly model links; moonphase model link after compute
 * Run: node tools/visual-check/_wave2-deeplink.mjs [base]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8790';
const b = await chromium.launch();
const failures = [];
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures.push(name);
}

// 1–2 — explore deep-link receiver
{
  const page = await b.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const iso = '2020-06-14T12:00:00.000Z';
  await page.goto(`${BASE}/explore.html#m=${encodeURIComponent(iso)}&focus=mars`, {
    waitUntil: 'load',
    timeout: 60000,
  });
  await page.waitForTimeout(4500);
  const parsed = await page.evaluate(() => {
    if (typeof window.__apParseModelHash !== 'function') return null;
    return window.__apParseModelHash();
  });
  gate(
    'explore parseModelHash exposed',
    !!parsed && parsed.focus === 'mars' && !!parsed.m,
    JSON.stringify(parsed)
  );
  // Wait for engines to apply
  let applied = '';
  for (let i = 0; i < 40; i++) {
    applied = await page.evaluate(() => document.documentElement.getAttribute('data-ap-model-link') || '');
    if (applied.includes('mars')) break;
    await page.waitForTimeout(250);
  }
  gate('explore applies #m=+focus=', applied.includes('mars'), `data-ap-model-link=${applied}`);
  // Hash-only focus
  await page.evaluate(() => {
    location.hash = 'focus=jupiter';
  });
  await page.waitForTimeout(1500);
  applied = await page.evaluate(() => document.documentElement.getAttribute('data-ap-model-link') || '');
  gate('explore hashchange focus=', applied.includes('jupiter'), `data-ap-model-link=${applied}`);
  gate('explore no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

// 3a — horoscope dial model link
{
  const page = await b.newPage();
  await page.goto(`${BASE}/horoscope.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  const href = await page.locator('#dial-model-link').getAttribute('href');
  gate('horoscope dial-model-link', !!href && href.includes('explore.html') && href.includes('m='), `href=${href}`);
  await page.close();
}

// 3b — moment model link (present, hidden until freeze — just check node)
{
  const page = await b.newPage();
  await page.goto(`${BASE}/moment.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const count = await page.locator('#mom-model-link').count();
  gate('moment mom-model-link present', count === 1, `count=${count}`);
  await page.close();
}

// 3c — weekly-sky model links after render (forceRender bypasses webdriver bail)
{
  const page = await b.newPage();
  await page.goto(`${BASE}/this-weeks-sky.html`, { waitUntil: 'load', timeout: 45000 });
  // Wait until WeeklySky paints at least one event row (engines inject async).
  try {
    await page.waitForSelector('a.wk-event__model', { timeout: 12000 });
  } catch (_) { /* gated below */ }
  await page.waitForTimeout(500);
  const n = await page.locator('a.wk-event__model').count();
  const href0 = n > 0 ? await page.locator('a.wk-event__model').first().getAttribute('href') : '';
  gate(
    'weekly-sky model links',
    n >= 1 && href0.includes('explore.html') && href0.includes('m='),
    `count=${n} href0=${href0}`
  );
  await page.close();
}

// 3d — quiz feeder on homepage
{
  const page = await b.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const quiz = await page.locator('a[href="quiz.html"]').count();
  gate('index quiz feeder', quiz >= 1, `count=${quiz}`);
  await page.close();
}

// 3e — moonphase model link after compute
{
  const page = await b.newPage();
  await page.goto(`${BASE}/moonphase.html`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.locator('#moonphase-date').fill('1990-06-14');
  await page.locator('#moonphase-submit').click();
  await page.waitForTimeout(2000);
  const model = await page.locator('#moonphase-result a[href*="explore.html"]').count();
  const href = model > 0
    ? await page.locator('#moonphase-result a[href*="explore.html"]').first().getAttribute('href')
    : '';
  gate(
    'moonphase model link after compute',
    model >= 1 && href.includes('focus=moon'),
    `count=${model} href=${href}`
  );
  await page.close();
}

await b.close();
if (failures.length) {
  console.error('\nFAILED:', failures.join(', '));
  process.exit(1);
}
console.log('\nALL WAVE-2 GATES PASS');
