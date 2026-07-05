/**
 * Icon/badge fix verification capture.
 * Forces the REAL (non-audit) render path so deferred main.css + fonts load,
 * then captures each SKY/DAILY page at desktop + mobile, records console
 * errors and failed requests. Usage: node iconfix-capture.mjs [tag]
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8790';
const TAG = process.argv[2] || 'baseline';
const OUT = join(__dirname, 'out', 'redesign');

const REAL_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const PAGES = [
  { id: 'horoscope', path: '/horoscope.html' },
  { id: 'ephemeris', path: '/ephemeris.html' },
  { id: 'tonight', path: '/tonight.html' },
  { id: 'this-weeks-sky', path: '/this-weeks-sky.html' },
  { id: 'transits', path: '/transits.html' },
];
const VPS = [
  { tag: 'desktop', width: 1440, height: 900 },
  { tag: 'mobile', width: 390, height: 844 },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {};
  for (const p of PAGES) {
    report[p.id] = {};
    for (const vp of VPS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: 'dark',
        userAgent: REAL_UA,
      });
      // defeat the audit gate: webdriver=false, real chrome object
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = window.chrome || { runtime: {} };
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const failed = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
      });
      page.on('requestfailed', (r) => {
        failed.push(`${r.url()} (${r.failure()?.errorText || 'failed'})`);
      });
      page.on('response', (r) => {
        if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
      });
      try {
        await page.goto(BASE + p.path, { waitUntil: 'load', timeout: 30000 });
      } catch (e) {
        consoleErrors.push('GOTO: ' + e.message.slice(0, 80));
      }
      // force deferred CSS (main.css, page-deferred) which loads on pointerdown
      await page.waitForTimeout(600);
      await page.evaluate(() => {
        try { window.dispatchEvent(new Event('pointerdown')); } catch (e) {}
        // belt-and-braces: directly inject the design system if a hook exists
        if (typeof window.deferMainCss === 'function') {
          const l = document.createElement('link');
          l.rel = 'stylesheet'; l.href = 'css/main.css'; l.id = 'ap-css-main-forced';
          if (!document.getElementById('ap-css-main')) document.head.appendChild(l);
        }
        if (!document.getElementById('ap-css-fonts')) {
          const f = document.createElement('link');
          f.rel = 'stylesheet'; f.href = 'css/fonts.css'; f.id = 'ap-css-fonts';
          document.head.appendChild(f);
        }
      });
      await page.waitForTimeout(2800);
      const file = join(OUT, `iconfix-${p.id}-${vp.tag}-${TAG}.png`);
      await page.screenshot({ path: file, fullPage: false });
      report[p.id][vp.tag] = {
        errors: consoleErrors,
        failed: failed.filter((f) => !/favicon/.test(f)),
      };
      await context.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
