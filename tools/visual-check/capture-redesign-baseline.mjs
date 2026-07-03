/**
 * Redesign baseline: full-page homepage captures (desktop + mobile),
 * with the real (non-lite) path and animations settled.
 * Usage: node capture-redesign-baseline.mjs [baseUrl] [tag]
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const TAG = process.argv[3] || 'baseline';
const OUT = join(__dirname, 'out', 'redesign');

const SHOTS = [
  { id: 'home-desktop', path: '/', vp: { width: 1440, height: 900 }, full: true },
  { id: 'home-desktop-hero', path: '/', vp: { width: 1440, height: 900 }, full: false },
  { id: 'home-mobile', path: '/', vp: { width: 390, height: 844 }, full: true },
  { id: 'chart-desktop', path: '/chart.html', vp: { width: 1440, height: 900 }, full: false },
  { id: 'horoscope-desktop', path: '/horoscope.html', vp: { width: 1440, height: 900 }, full: false },
  { id: 'ephemeris-desktop', path: '/ephemeris.html', vp: { width: 1440, height: 900 }, full: false },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  for (const shot of SHOTS) {
    const context = await browser.newContext({ viewport: shot.vp, colorScheme: 'dark' });
    const page = await context.newPage();
    try {
      await page.goto(BASE + shot.path, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) {
      console.log(`${shot.id}: goto fallback (${e.message.slice(0, 60)})`);
    }
    await page.waitForTimeout(3500);
    // reveal scroll-gated content for full-page shots
    if (shot.full) {
      await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 250));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1500);
    }
    const file = join(OUT, `${shot.id}-${TAG}.png`);
    await page.screenshot({ path: file, fullPage: shot.full });
    const h = await page.evaluate(() => document.body.scrollHeight);
    console.log(`${shot.id}: ${file} (pageHeight=${h})`);
    await context.close();
  }
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
