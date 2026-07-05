/**
 * Glyph-system audit shots — home #skyChapter Plate I dial, twelve-signs grid,
 * ephemeris field weather, horoscope glyph usage, tonight planet chips.
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'glyph-audit');

async function shoot(page, sel, path, full = false) {
  const el = sel ? await page.$(sel) : null;
  if (el) { await el.screenshot({ path }); return true; }
  await page.screenshot({ path, fullPage: full });
  return false;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
    try { localStorage.setItem('ap_privacy_ack', '1'); localStorage.setItem('ap_narrate_journey', '0'); } catch (_) {}
  });
  const log = [];

  // 1. Homepage Plate I dial (#skyChapter)
  {
    const page = await context.newPage();
    await page.goto(`${BASE}/?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3500);
    await page.evaluate(() => { const s = document.getElementById('skyChapter'); if (s) s.scrollIntoView({ block: 'start' }); });
    await page.waitForTimeout(1500);
    // the SVG dial figure
    const fig = await page.$('#skyChapter figure');
    if (fig) await fig.screenshot({ path: join(OUT, 'home-plate1-dial.png') });
    await page.screenshot({ path: join(OUT, 'home-skychapter-full.png') });
    // dump the computed font on a zodiac glyph + whether emoji renders
    const diag = await page.evaluate(() => {
      const g = document.querySelector('#skyChapter .zc-glyph');
      if (!g) return { found: false };
      const cs = getComputedStyle(g);
      return { found: true, text: g.textContent, fontFamily: cs.fontFamily, fill: cs.fill, fontSize: cs.fontSize };
    });
    log.push({ homeDialGlyph: diag });
    await page.close();
  }

  // 2. Twelve-signs grid (scroll to library-heading)
  {
    const page = await context.newPage();
    await page.goto(`${BASE}/?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const box = await page.evaluate(() => {
      const grid = document.querySelector('.sign-tile-grid');
      if (!grid) return null;
      grid.scrollIntoView({ block: 'center' });
      const b = grid.getBoundingClientRect();
      return { y: b.top + window.scrollY, h: b.height };
    });
    await page.waitForTimeout(1200);
    const gridEl = await page.$('.sign-tile-grid');
    if (gridEl) await gridEl.screenshot({ path: join(OUT, 'home-twelve-signs.png') });
    else await page.screenshot({ path: join(OUT, 'home-twelve-signs.png') });
    await page.close();
  }

  // 3. Ephemeris field weather
  {
    const page = await context.newPage();
    await page.goto(`${BASE}/ephemeris.html?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(OUT, 'ephemeris-top.png') });
    // scroll to field weather
    const fw = await page.evaluate(() => {
      const el = document.querySelector('[class*="field-weather"], [id*="field"], #fieldWeather, .fw-grid, [class*="weather"]');
      if (el) { el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { y: b.top + window.scrollY, h: b.height }; }
      return null;
    });
    await page.waitForTimeout(1500);
    const fwEl = await page.$('[class*="field-weather"], #fieldWeather, .fw-grid');
    if (fwEl) await fwEl.screenshot({ path: join(OUT, 'ephemeris-fieldweather.png') });
    else await page.screenshot({ path: join(OUT, 'ephemeris-fieldweather.png') });
    await page.close();
  }

  // 4. Horoscope glyph usage (dial + chips)
  {
    const page = await context.newPage();
    await page.goto(`${BASE}/horoscope.html?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(OUT, 'horoscope-top.png') });
    const leg = await page.evaluate(() => {
      const el = document.getElementById('planet-legend') || document.querySelector('.planet-legend, [class*="legend"]');
      if (el) { el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { y: b.top + window.scrollY, h: b.height, html: el.outerHTML.slice(0, 400) }; }
      return null;
    });
    await page.waitForTimeout(1200);
    const legEl = await page.$('#planet-legend, .planet-legend');
    if (legEl) await legEl.screenshot({ path: join(OUT, 'horoscope-legend.png') });
    if (leg) log.push({ horoscopeLegendHtml: leg.html });
    await page.close();
  }

  // 5. tonight.html planet chips
  {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/tonight.html?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: join(OUT, 'tonight-top.png') });
    } catch (e) { log.push({ tonightErr: e.message }); }
    await page.close();
  }

  console.log(JSON.stringify({ out: OUT, log }, null, 2));
  await browser.close();
}
main();
