/**
 * Retoken verify: chart / shop / horoscope / email sticky bar at 1440x900,
 * real (non-lite) CSS path forced (deferred stylesheets included).
 * Usage: node retoken-capture.mjs [tag]   → out/redesign/retoken-<id>-<tag>.png
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8790';
const TAG = process.argv[2] || 'before';
const OUT = join(__dirname, 'out', 'redesign');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const SHOTS = [
  { id: 'chart', path: '/chart.html' },
  { id: 'shop', path: '/shop.html' },
  { id: 'horoscope', path: '/horoscope.html' },
  { id: 'sticky', path: '/horoscope.html', sticky: true },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  for (const shot of SHOTS) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'dark',
      userAgent: UA,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      if (!window.chrome) window.chrome = { runtime: {} };
      try { localStorage.removeItem('ap_email_sticky_dismiss'); } catch (e) {}
    });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    try {
      await page.goto(BASE + shot.path, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) {
      console.log(`${shot.id}: goto fallback (${e.message.slice(0, 60)})`);
    }
    await page.waitForTimeout(1500);
    // Deferred CSS (main.css etc.) loads on first pointerdown — synthesize one.
    await page.evaluate(() => {
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    try {
      await page.waitForSelector('link#ap-css-main', { state: 'attached', timeout: 8000 });
    } catch (e) {
      console.log(`${shot.id}: ap-css-main did not attach`);
    }
    await page.waitForTimeout(3000); // let stylesheets apply / repaint settle
    const deferred = await page.evaluate(() =>
      Array.from(document.querySelectorAll('link[id^="ap-css-"]')).map(l => l.id));
    if (shot.sticky) {
      await page.evaluate(() => window.scrollTo(0, 700));
      try {
        await page.waitForSelector('.ap-email-cta--sticky.is-visible', { timeout: 12000 });
      } catch (e) {
        console.log(`${shot.id}: sticky bar did not appear`);
      }
      await page.waitForTimeout(800);
      const bg = await page.evaluate(() => {
        const el = document.querySelector('.ap-email-cta--sticky');
        return el ? getComputedStyle(el).backgroundColor : 'none';
      });
      console.log(`${shot.id}: sticky bg = ${bg}`);
    }
    const file = join(OUT, `retoken-${shot.id}-${TAG}.png`);
    await page.screenshot({ path: file });
    console.log(`${shot.id}: ${file}`);
    console.log(`${shot.id}: deferredCss=[${deferred.join(',')}] consoleErrors=${errors.length}${errors.length ? ' :: ' + errors.slice(0, 4).join(' | ') : ''}`);
    await context.close();
  }
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
