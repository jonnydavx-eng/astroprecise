/**
 * Verify the daily (horoscope) + sky (ephemeris) story-spine wiring.
 * Checks: stabilized "The Sky" naming, on-ramp, closers, Deep Reading CTAs,
 * beginner glosses, zero console errors, no honesty violations.
 * Usage: node verify-daily-sky.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'redesign');

const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 900 },
  { id: 'mobile', width: 390, height: 844 },
];

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail: detail || '' });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });

    // ── EPHEMERIS (The Sky) ──
    {
      const page = await context.newPage();
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push(String(e)));
      await page.goto(`${BASE}/ephemeris.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);

      if (vp.id === 'desktop') {
        const title = await page.title();
        check('ephemeris <title> is "The Sky | Astro Precise"', title === 'The Sky | Astro Precise', title);
        const eyebrow = (await page.locator('.instrument-eyebrow--seal').first().textContent() || '').trim();
        check('ephemeris eyebrow = "The Sky"', eyebrow === 'The Sky', eyebrow);
        const h1 = (await page.locator('#instrument-heading').textContent() || '').trim();
        check('ephemeris H1 = "The Sky"', h1 === 'The Sky', h1);
        const onramp = (await page.locator('.instrument-onramp').first().textContent() || '').trim();
        check('ephemeris on-ramp line present', /real sky above you right now/i.test(onramp), onramp.slice(0, 80));
        // closer CTAs
        const chartCta = await page.locator('a[href="chart.html"]', { hasText: /Cast your chart/i }).count();
        check('ephemeris closer → chart.html "Cast your chart"', chartCta > 0);
        const deepCta = await page.locator('a[href="shop.html#deep-reading"]').count();
        check('ephemeris closer → shop.html#deep-reading', deepCta > 0);
        // glosses
        const glossCount = await page.locator('abbr.ap-gloss').count();
        check('ephemeris has ap-gloss glosses', glossCount >= 2, `${glossCount} found`);
        // honesty: no arcsecond, arcminute + date range present
        const body = await page.evaluate(() => document.body.innerText);
        check('ephemeris: no "arcsecond" in body', !/arcsecond/i.test(body));
        check('ephemeris: "arcminute" + 1800–2200 CE present', /arcminute/i.test(body) && /1800.?2200.?CE/i.test(body));
        check('ephemeris: "computed live"/"on your device" honesty phrasing', /computed live on your device/i.test(body) || /computed on your device/i.test(body));
        check('ephemeris: zero console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
      }
      await page.screenshot({ path: join(OUT, `daily-sky-ephemeris-${vp.id}.png`), fullPage: false });
      await page.close();
    }

    // ── HOROSCOPE (Daily) ──
    {
      const page = await context.newPage();
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push(String(e)));
      await page.goto(`${BASE}/horoscope.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);

      if (vp.id === 'desktop') {
        const body = await page.evaluate(() => document.body.innerText);
        check('horoscope: beginner "real transits not generic Sun-sign" line', /not a generic Sun-sign column/i.test(body));
        // Deep Reading closer
        const closerHeading = await page.locator('#deep-reading-closer-heading').count();
        check('horoscope: Deep Reading closer section present', closerHeading > 0);
        const castCta = await page.locator('a[href="chart.html"]', { hasText: /Cast your free chart/i }).count();
        check('horoscope closer → chart.html "Cast your free chart"', castCta > 0);
        const deepCta = await page.locator('a[href="shop.html#deep-reading"]', { hasText: /Deep Reading/i }).count();
        check('horoscope closer → shop.html#deep-reading "Get your Deep Reading"', deepCta > 0);
        const glossCount = await page.locator('abbr.ap-gloss').count();
        check('horoscope has ap-gloss glosses', glossCount >= 2, `${glossCount} found`);
        check('horoscope: no "arcsecond" in body', !/arcsecond/i.test(body));
        check('horoscope: zero console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
      }
      await page.screenshot({ path: join(OUT, `daily-sky-horoscope-${vp.id}.png`), fullPage: false });
      await page.close();
    }

    await context.close();
  }

  await browser.close();

  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) { console.log('FAILURES:'); failed.forEach(f => console.log('  - ' + f.name + (f.detail ? ' :: ' + f.detail : ''))); process.exit(1); }
}

run().catch(e => { console.error(e); process.exit(1); });
