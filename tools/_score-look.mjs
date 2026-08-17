import { chromium } from './visual-check/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const out = join(process.cwd(), 'launch-output', 'score-look');
mkdirSync(out, { recursive: true });
const BASE = 'http://127.0.0.1:8790';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const notes = [];

async function shot(name) {
  const file = join(out, name + '.png');
  await page.screenshot({ path: file, fullPage: false });
  notes.push({ name, file, url: page.url() });
}

await page.goto(BASE + '/index.html?nosw=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(2500);
await shot('01-home');

await page.goto(BASE + '/chart.html?nosw=1&v=888', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(800);
await shot('02-chart-form');

await page.click('button:has-text("Sample Chart")');
await page.waitForSelector('#natal-wheel svg .planet-glyph[data-planet="Sun"]', { timeout: 45000 });
await page.evaluate(() => document.getElementById('chart-result')?.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(500);
await shot('03-chart-result-top');

await page.evaluate(() => document.getElementById('natal-wheel')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(400);
await shot('04-wheel-before-click');

await page.evaluate(() => {
  const sun = document.querySelector('#natal-wheel svg .planet-glyph[data-planet="Sun"]');
  sun?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
});
await page.waitForTimeout(500);
const after = await page.evaluate(() => {
  const panel = document.getElementById('chart-wheel-reading');
  const wheel = document.getElementById('natal-wheel');
  const wr = wheel?.getBoundingClientRect();
  const pr = panel?.getBoundingClientRect();
  return {
    panelHidden: panel?.hidden ?? null,
    title: document.getElementById('chart-wheel-reading-title')?.textContent || '',
    body: (document.getElementById('chart-wheel-reading-body')?.textContent || '').slice(0, 180),
    active: document.querySelectorAll('#natal-wheel svg .planet-glyph.is-active').length,
    dimmed: document.querySelectorAll('#natal-wheel svg .planet-glyph.is-dimmed').length,
    hasReadingClass: !!document.querySelector('.chart-wheel-card--has-reading'),
    wheelVisible: !!(wr && wr.bottom > 80 && wr.top < window.innerHeight - 40),
    panelVisible: !!(pr && !panel.hidden && pr.height > 40),
    bothInView: !!(wr && pr && !panel.hidden && wr.top < window.innerHeight && pr.bottom > 0 && wr.bottom > 0 && Math.min(wr.bottom, window.innerHeight) - Math.max(wr.top, 0) > 120),
  };
});
notes.push({ name: 'click-state', ...after });
await shot('05-wheel-after-sun-click');

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/chart.html?nosw=1&v=888', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.click('button:has-text("Sample Chart")');
await page.waitForSelector('#natal-wheel svg', { timeout: 45000 });
await page.evaluate(() => document.getElementById('natal-wheel')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(600);
await shot('06-wheel-phone');

await page.goto(BASE + '/index.html?nosw=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(2500);
await shot('07-home-phone');

writeFileSync(join(out, 'notes.json'), JSON.stringify(notes, null, 2));
console.log(JSON.stringify(notes, null, 2));
await browser.close();
