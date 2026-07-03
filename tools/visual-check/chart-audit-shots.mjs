/** chart.html expert-audit capture — desktop + mobile, empty form + advanced + full results.
 *  Usage: node chart-audit-shots.mjs [http://localhost:8790]
 *  Writes out/chart-audit/*.png and prints a small JSON state summary + console errors. */
import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'chart-audit');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(label, viewport) {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport, colorScheme: 'dark', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });

  // Fresh visitor coming from the homepage hero (date handoff in the URL).
  await page.goto(BASE + '/chart.html?date=1907-07-06', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => typeof window.AstroEphemeris !== 'undefined', null, { timeout: 30000 });
  await sleep(600);

  const shot = async (name, opts) => {
    await page.screenshot({ path: join(OUT, `${label}-${name}.png`), ...opts });
    console.log('shot', `${label}-${name}`);
  };

  // 1) Empty form as a first-timer sees it (with the prefilled date visible)
  await shot('01-hero-top', { fullPage: false });
  const prefill = await page.evaluate(() => document.getElementById('date-input')?.value || '');

  // 2) Advanced options expanded (house system + node model)
  await page.click('#chart-advanced-trigger').catch(() => {});
  await sleep(500);
  const advPanel = await page.$('#chart-advanced');
  if (advPanel) { await advPanel.scrollIntoViewIfNeeded(); await sleep(300); await shot('02-advanced-open', { fullPage: false }); }

  // 3) Cast the sample chart (Frida Kahlo) → full results
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#sample-btn');
  await sleep(9000);
  const state = await page.evaluate(() => ({
    resultHidden: document.getElementById('chart-result')?.classList.contains('hidden'),
    wheelSvg: !!document.querySelector('#natal-wheel svg.natal-chart, #natal-wheel canvas, #natal-wheel svg:not(.ap-wheel-placeholder)'),
    placeholder: !!document.querySelector('#natal-wheel .ap-wheel-placeholder'),
    bigThree: [...document.querySelectorAll('.big-three-card__sign')].map((e) => e.textContent.trim()),
    resultDate: document.getElementById('result-date')?.textContent,
    resultBadge: document.querySelector('.result-badge')?.textContent?.trim(),
  }));

  // full-page results
  await shot('03-results-full', { fullPage: true });

  // wheel close-up
  const wheel = await page.$('.chart-wheel-hero');
  if (wheel) { await wheel.scrollIntoViewIfNeeded(); await sleep(400); await shot('04-wheel', { fullPage: false }); }

  // result header + actions + big three
  const header = await page.$('.result-header-card');
  if (header) { await header.scrollIntoViewIfNeeded(); await sleep(300); await shot('05-header-actions'); }

  // Tabs: planets, houses, aspects
  for (const [id, nm] of [['tab-planets-btn','06-planets'], ['tab-houses-btn','07-houses'], ['tab-aspects-btn','08-aspects']]) {
    const btn = await page.$('#' + id);
    if (btn) { await btn.click(); await sleep(500); await btn.scrollIntoViewIfNeeded(); await sleep(300); await shot(nm); }
  }

  await ctx.close();
  await browser.close();
  return { label, viewport, prefill, state, errors: [...new Set(errors)] };
}

const results = [];
results.push(await run('desktop', { width: 1440, height: 950 }));
results.push(await run('mobile', { width: 390, height: 844 }));
console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(results, null, 2));
