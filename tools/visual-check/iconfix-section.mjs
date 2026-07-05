/** Capture a specific selector region on a page (real render path). */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'redesign');
const REAL_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// argv: path selector outName [tag]
const [, , pagePath, selector, outName, tag = 'now'] = process.argv;

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'dark',
    userAgent: REAL_UA,
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = window.chrome || { runtime: {} };
  });
  const page = await context.newPage();
  await page.goto(BASE + pagePath, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    try { window.dispatchEvent(new Event('pointerdown')); } catch (e) {}
    if (!document.getElementById('ap-css-main')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = 'css/main.css'; l.id = 'ap-css-main-forced';
      document.head.appendChild(l);
    }
    if (!document.getElementById('ap-css-fonts')) {
      const f = document.createElement('link');
      f.rel = 'stylesheet'; f.href = 'css/fonts.css'; f.id = 'ap-css-fonts';
      document.head.appendChild(f);
    }
  });
  await page.waitForTimeout(3500);
  const el = await page.$(selector);
  const file = join(OUT, `iconfix-${outName}-${tag}.png`);
  if (el) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await el.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: false });
    console.log('SELECTOR NOT FOUND, full-viewport shot');
  }
  console.log(file);
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
