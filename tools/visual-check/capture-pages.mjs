/**
 * Screenshot every major AstroPrecise UI component (static pages).
 * Usage: node capture-pages.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'pages');

const PAGES = [
  { id: 'chart', path: '/chart.html', wait: '#chart-form, .chart-form, form', note: 'Birth chart form + wheel mount' },
  { id: 'horoscope', path: '/horoscope.html', wait: '.horoscope-hero, .section__title, main', note: 'Daily horoscope hub' },
  { id: 'compatibility', path: '/compatibility.html', wait: 'main, .compat', note: 'Synastry / match UI' },
  { id: 'ephemeris', path: '/ephemeris.html', wait: '#orrery-canvas, .instrument, main', note: 'Sky instrument + ephemeris' },
  { id: 'lifepath', path: '/lifepath.html', wait: 'main, form', note: 'Life path numerology' },
  { id: 'shop', path: '/shop.html', wait: 'main, .shop', note: 'Shop / readings' },
  { id: 'sign-aries', path: '/aries.html', wait: '.sign-hero, main', note: 'Sign page template' },
  { id: 'moonphase', path: '/moonphase.html', wait: 'main', note: 'Moon phase tool' },
  { id: 'angel-numbers', path: '/angel-numbers.html', wait: 'main', note: 'Synchronicity clock' },
];

async function snap(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function readPageState(page) {
  return page.evaluate(() => ({
    title: document.title,
    hasStarfield: !!document.getElementById('starfield-canvas'),
    starfieldOpacity: document.getElementById('starfield-canvas')
      ? getComputedStyle(document.getElementById('starfield-canvas')).opacity : null,
    hasCosmicArt: !!document.querySelector('.hero-cosmic-ref, [class*="cosmic-ref"]'),
    bodyClass: document.body.className,
    h1: document.querySelector('h1')?.textContent?.trim()?.slice(0, 80) || '',
  }));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });

  await context.addInitScript(() => {
    try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
    try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
  });

  const report = { base: BASE, capturedAt: new Date().toISOString(), pages: [], issues: [] };

  for (const p of PAGES) {
    const page = await context.newPage();
    const entry = { id: p.id, path: p.path, note: p.note, ok: true };
    try {
      await page.goto(`${BASE}${p.path}?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector(p.wait, { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(800);
      entry.state = await readPageState(page);
      entry.shot = await snap(page, p.id);

      if (!entry.state.hasStarfield && p.id !== 'shop') {
        report.issues.push(`${p.id}: missing #starfield-canvas`);
        entry.ok = false;
      }
      if (entry.state.hasCosmicArt) {
        report.issues.push(`${p.id}: hero cosmic mockup art still visible (duplicate sky risk)`);
        entry.ok = false;
      }
    } catch (err) {
      entry.ok = false;
      entry.error = String(err);
      report.issues.push(`${p.id}: ${err.message || err}`);
      await snap(page, `${p.id}-error`).catch(() => {});
    }
    report.pages.push(entry);
    await page.close();
  }

  // Hero (post-intro) — index with intro skipped
  const heroPage = await context.newPage();
  const hero = { id: 'hero-entered', path: '/index.html', note: 'Hero orrery after intro skip' };
  try {
    await heroPage.goto(`${BASE}/?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await heroPage.waitForSelector('#orrery-canvas', { timeout: 20000 });
    await heroPage.waitForTimeout(1500);
    hero.state = await readPageState(heroPage);
    hero.state.orreryReady = await heroPage.evaluate(() => !!(window.Orrery3D && window.__orreryReady));
    hero.shot = await snap(heroPage, 'hero-entered');
    const box = await heroPage.evaluate(() => {
      const c = document.getElementById('orrery-canvas');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    hero.canvasBox = box;
    if (!box || box.w < 200 || box.h < 200) {
      report.issues.push('hero-entered: orrery canvas too small or missing');
      hero.ok = false;
    } else hero.ok = true;
  } catch (err) {
    hero.ok = false;
    hero.error = String(err);
    report.issues.push(`hero-entered: ${err.message || err}`);
  }
  report.pages.push(hero);
  await heroPage.close();

  report.ok = report.issues.length === 0;
  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exitCode = report.ok ? 0 : 1;
}

main();