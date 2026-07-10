/* Wave-1 functional gates:
 * 1. chart-view.html (deferred engines) still renders wheel + big-three; new cast CTA present.
 * 2. links.html #lib-paid renders the live email + Ko-fi links after AP_MON boot.
 * 3. charts.html shows the reading-path strip when a saved chart exists,
 *    and the active badge links to horoscope.html.
 * 4. fulfil-redirect.html: unknown form -> fallback; known form -> typeform redirect.
 * Run from repo root: node tools/visual-check/_wave1-functional.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8790';
const b = await chromium.launch();
const failures = [];
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures.push(name);
}

// 1 — chart-view with deferred engine scripts
{
  const page = await b.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(BASE + '/chart-view.html?n=Test&d=1990-06-14&t=03:42&c=Whitby&lat=54.486&lon=-0.613&tz=Europe/London', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const big3 = await page.locator('#view-big-three:not([hidden])').count();
  const wheel = await page.locator('#natal-wheel svg').count();
  const cast = await page.getByText('Cast your own free chart').count();
  gate('chart-view wheel renders with defer', big3 === 1 && wheel >= 1, `big3=${big3} wheel=${wheel}`);
  gate('chart-view cast-your-own CTA', cast === 1, `count=${cast}`);
  gate('chart-view no page errors', errors.length === 0, errors.join(' | '));
  await page.close();
}

// 2 — links.html paid block
{
  const page = await b.newPage();
  await page.goto(BASE + '/links.html', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const links = await page.locator('#lib-paid a').evaluateAll(as => as.map(a => a.href));
  const hasEmail = links.some(h => /list\.astroprecise\.app/.test(h));
  const hasTip = links.some(h => /ko-fi\.com/.test(h));
  gate('links.html #lib-paid renders live links', hasEmail && hasTip, links.join(', ') || 'EMPTY');
  await page.close();
}

// 3 — charts.html strip + active badge
{
  const page = await b.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ap_charts', JSON.stringify([{
      id: 'w1test', name: 'Wave Test', birthDate: '1990-06-14', birthTime: '03:42',
      birthCity: 'Whitby', lat: 54.486, lon: -0.613, tz: 'Europe/London',
      sunSign: 'Gemini', moonSign: 'Aquarius', risingSign: 'Gemini',
    }]));
    localStorage.setItem('ap_active_chart', 'w1test');
  });
  await page.goto(BASE + '/charts.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const strip = await page.locator('#mc-reading-path').count();
  const sample = await page.locator('#mc-reading-path a[href="sample-reading.html"]').count();
  const badgeHref = await page.locator('a.mc-card__active').getAttribute('href').catch(() => null);
  gate('charts.html reading-path strip', strip === 1 && sample === 1, `strip=${strip} sample=${sample}`);
  gate('charts.html active badge links horoscope', badgeHref === 'horoscope.html', `href=${badgeHref}`);
  await page.close();
}

// 4 — fulfil-redirect whitelist
{
  const page = await b.newPage();
  await page.goto(BASE + '/fulfil-redirect.html?form=EvilForm1', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const body = await page.textContent('body');
  gate('fulfil-redirect blocks unknown form', /Missing form reference/.test(body) && page.url().startsWith(BASE));

  const page2 = await b.newPage();
  let dest = null;
  await page2.route('https://form.typeform.com/**', r => { dest = r.request().url(); r.abort(); });
  await page2.goto(BASE + '/fulfil-redirect.html?form=JVU3Atfm&email=a@b.c', { waitUntil: 'load' }).catch(() => {});
  await page2.waitForTimeout(800);
  gate('fulfil-redirect forwards known form', dest !== null && dest.includes('/to/JVU3Atfm'), String(dest));
  await page.close(); await page2.close();
}

await b.close();
console.log(failures.length ? `\n${failures.length} FAILURES` : '\nALL GATES PASS');
process.exit(failures.length ? 1 : 0);
