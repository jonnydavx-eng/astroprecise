/**
 * Ground-truth debug for AstroPrecise local preview.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out', 'user-zero-score');
const BASE = process.argv[2] || 'http://localhost:8790';

const PAGES = [
  { id: 'home', url: `${BASE}/` },
  { id: 'home-lite', url: `${BASE}/?lite=1` },
  { id: 'mysky', url: `${BASE}/mysky.html` },
  { id: 'chart', url: `${BASE}/chart.html` },
  { id: 'horoscope', url: `${BASE}/horoscope.html` },
  { id: 'shop', url: `${BASE}/shop.html` },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { base: BASE, at: new Date().toISOString(), pages: [] };

  for (const p of PAGES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const entry = {
      id: p.id,
      url: p.url,
      console: [],
      pageErrors: [],
      failed: [],
      ok: false,
    };

    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        entry.console.push({ type: msg.type(), text: msg.text() });
      }
    });
    page.on('pageerror', (err) => entry.pageErrors.push(String(err)));
    page.on('requestfailed', (req) => {
      entry.failed.push({
        url: req.url(),
        err: req.failure() ? req.failure().errorText : 'fail',
      });
    });

    try {
      const resp = await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      entry.status = resp ? resp.status() : null;
      await page.waitForTimeout(p.id.includes('mysky') || p.id.startsWith('home') ? 5000 : 2500);

      entry.dom = await page.evaluate(() => {
        const host = document.getElementById('mysky-orrery');
        const canvas = document.querySelector('#mysky-orrery canvas') || document.querySelector('.ap-orrery-host canvas');
        const journey = document.getElementById('ap-journey');
        const fab = document.getElementById('ap-continue-fab');
        const tabs = document.getElementById('ap-bottom-tabs');
        let canvasInfo = null;
        if (canvas) {
          canvasInfo = {
            w: canvas.width,
            h: canvas.height,
            cssW: canvas.clientWidth,
            cssH: canvas.clientHeight,
          };
        }
        return {
          title: document.title,
          h1: document.querySelector('h1') ? document.querySelector('h1').innerText : '',
          bodyClass: document.body.className,
          bg: getComputedStyle(document.body).backgroundColor,
          journey: !!journey,
          fab: !!fab,
          tabs: !!tabs,
          three: typeof window.THREE !== 'undefined',
          initOrrery: typeof window.initOrrery,
          Orrery3D: typeof window.Orrery3D,
          myskyHost: !!host,
          cinematicApi: !!(host && host.__apCinematic),
          canvas: canvasInfo,
          designCss: !!document.querySelector('link[href*="ap-design-system"]'),
          shellScript: !!document.querySelector('script[src*="ap-shell"]'),
          orreryScript: !!document.querySelector('script[src*="orrery-cinematic"]'),
          threeScript: !!document.querySelector('script[src*="three"]'),
          brokenSections: document.querySelectorAll('[id*="cinematic-orrery"]').length,
        };
      });

      await page.screenshot({ path: join(OUT, p.id + '.png'), fullPage: false });
      entry.ok = true;
    } catch (e) {
      entry.error = String(e);
      try {
        await page.screenshot({ path: join(OUT, p.id + '-fail.png'), fullPage: false });
      } catch (_) {}
    }

    report.pages.push(entry);
    await context.close();
  }

  await writeFile(join(OUT, 'debug-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
