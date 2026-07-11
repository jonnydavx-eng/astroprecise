/**
 * Verify the on-system horoscope dial backdrop (ecliptic-space-bg.jpg removed).
 * - Screenshots the dial + hero at 1440x900 and 390x844 → out/redesign/dial-backdrop-*.png
 * - Asserts: no request for ecliptic-space-bg.jpg, zero console errors.
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'redesign');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=swiftshader'],
  });

  const report = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
    });
    await context.addInitScript(() => {
      try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
      try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
      try { localStorage.setItem('ap_narrate_journey', '0'); } catch (_) {}
    });

    const page = await context.newPage();
    const jpgRequests = [];
    const consoleErrors = [];
    const pageErrors = [];

    page.on('request', (req) => {
      if (/ecliptic-space-bg\.jpg/i.test(req.url())) jpgRequests.push(req.url());
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    try {
      await page.goto(`${BASE}/horoscope.html?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('.sphere-wrap, .sphere-space-bg, main', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(4500);

      const wrap = await page.$('.sphere-wrap');
      if (wrap) await wrap.screenshot({ path: join(OUT, `dial-backdrop-${vp.name}.png`) });
      await page.screenshot({ path: join(OUT, `dial-backdrop-${vp.name}-hero.png`) });

      // Confirm the .sphere-space-bg no longer carries a url() background.
      const bgImage = await page.evaluate(() => {
        const el = document.querySelector('.sphere-space-bg');
        if (!el) return 'NO-ELEMENT';
        return getComputedStyle(el).backgroundImage;
      });

      report.push({
        viewport: vp.name,
        jpgRequests,
        consoleErrors,
        pageErrors,
        sphereSpaceBgBackgroundImage: bgImage,
        backgroundHasJpg: /ecliptic-space-bg/i.test(bgImage),
      });
    } catch (e) {
      report.push({ viewport: vp.name, error: e.message, jpgRequests, consoleErrors, pageErrors });
    }
    await page.close();
    await context.close();
  }

  const pass =
    report.every((r) => (r.jpgRequests || []).length === 0) &&
    report.every((r) => (r.consoleErrors || []).length === 0) &&
    report.every((r) => (r.pageErrors || []).length === 0) &&
    report.every((r) => r.backgroundHasJpg === false);

  console.log(JSON.stringify({ out: OUT, pass, report }, null, 2));
  await browser.close();
  process.exit(pass ? 0 : 1);
}
main();
