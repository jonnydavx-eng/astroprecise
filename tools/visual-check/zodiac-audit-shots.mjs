/**
 * Zodiac visual-system audit shots.
 * Captures sign-page heroes, the homepage twelve-signs chapter, and the horoscope dial.
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'zodiac-audit');

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=swiftshader'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
    try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
    try { localStorage.setItem('ap_narrate_journey', '0'); } catch (_) {}
  });

  const shots = [];

  // --- Sign pages: hero region ---
  for (const sign of ['aries', 'taurus', 'scorpio']) {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/${sign}.html?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('.sign-hero', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const el = await page.$('.sign-hero');
      if (el) await el.screenshot({ path: join(OUT, `sign-${sign}-hero.png`) });
      else await page.screenshot({ path: join(OUT, `sign-${sign}-hero.png`) });
      shots.push(`sign-${sign}-hero`);
    } catch (e) { shots.push(`ERR sign-${sign}: ${e.message}`); }
    await page.close();
  }

  // --- Homepage twelve-signs chapter ---
  {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      // Scroll the library chapter into view and screenshot it
      const found = await page.evaluate(() => {
        const h = document.getElementById('library-heading');
        const sec = h ? h.closest('section') : null;
        if (sec) { sec.scrollIntoView({ block: 'center' }); return true; }
        return false;
      });
      await page.waitForTimeout(1200);
      if (found) {
        const sec = await page.evaluateHandle(() => document.getElementById('library-heading').closest('section'));
        const box = await sec.asElement().boundingBox();
        if (box) await page.screenshot({ path: join(OUT, 'home-twelve-signs.png'), clip: { x: 0, y: box.y, width: 1440, height: Math.min(box.height, 1150) } });
      } else {
        await page.screenshot({ path: join(OUT, 'home-twelve-signs.png') });
      }
      shots.push('home-twelve-signs');
    } catch (e) { shots.push(`ERR home: ${e.message}`); }
    await page.close();
  }

  // --- Horoscope dial ---
  {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/horoscope.html?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('.sphere-wrap, .sphere-space-bg, main', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(4000);
      const el = await page.$('.sphere-wrap');
      if (el) await el.screenshot({ path: join(OUT, 'horoscope-dial.png') });
      else await page.screenshot({ path: join(OUT, 'horoscope-dial.png') });
      // also a wider hero shot
      await page.screenshot({ path: join(OUT, 'horoscope-hero.png') });
      shots.push('horoscope-dial');
    } catch (e) { shots.push(`ERR horoscope: ${e.message}`); }
    await page.close();
  }

  console.log(JSON.stringify({ out: OUT, shots }, null, 2));
  await browser.close();
}
main();
