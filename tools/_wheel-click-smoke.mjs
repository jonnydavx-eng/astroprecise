/**
 * Smoke: chart wheel click → reading panel.
 * Requires :8790. Uses system Chrome via Playwright.
 */
import { chromium } from './visual-check/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'launch-output', 'wheel-click-smoke');
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.AP_PREVIEW || 'http://127.0.0.1:8790';
const url = `${BASE}/chart.html?nosw=1&v=887`;

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const notes = { url, steps: [] };

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!(window.AstroChartRender && window.AstroEphemeris), null, { timeout: 30000 });

  await page.click('button:has-text("Sample Chart")');
  await page.waitForSelector('#natal-wheel svg .planet-glyph[data-planet="Sun"]', { timeout: 45000 });
  notes.steps.push('wheel rendered');

  await page.evaluate(() => {
    const sun = document.querySelector('#natal-wheel svg .planet-glyph[data-planet="Sun"]');
    if (!sun) throw new Error('Sun glyph missing');
    sun.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  await page.waitForSelector('#chart-wheel-reading:not([hidden])', { timeout: 10000 });
  const title = await page.locator('#chart-wheel-reading-title').innerText();
  const body = await page.locator('#chart-wheel-reading-body').innerText();
  const coolVoid = await page.evaluate(() => {
    const svg = document.querySelector('#natal-wheel svg');
    return !!(svg && getComputedStyle(document.body).backgroundColor);
  });
  notes.steps.push({ selected: 'Sun', title, bodyLen: body.length, coolVoid });
  notes.ok = /sun/i.test(title) && body.length > 40;

  await page.screenshot({ path: path.join(outDir, 'wheel-sun.png'), fullPage: false });
  fs.writeFileSync(path.join(outDir, 'notes.json'), JSON.stringify(notes, null, 2));
  console.log(notes.ok ? 'PASS wheel click → reading' : 'FAIL wheel click incomplete');
  console.log(JSON.stringify(notes, null, 2));
  process.exit(notes.ok ? 0 : 1);
} catch (err) {
  notes.error = String(err && err.stack || err);
  fs.writeFileSync(path.join(outDir, 'notes.json'), JSON.stringify(notes, null, 2));
  await page.screenshot({ path: path.join(outDir, 'fail.png'), fullPage: true }).catch(() => {});
  console.error('FAIL', notes.error);
  process.exit(1);
} finally {
  await browser.close();
}
