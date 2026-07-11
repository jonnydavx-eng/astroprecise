import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out', 'zodiac-audit');
const b = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=swiftshader'] });
const c = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
await c.addInitScript(() => { try { sessionStorage.setItem('ap_intro_complete', '1'); localStorage.setItem('ap_privacy_ack', '1'); } catch (e) {} });
const p = await c.newPage();
await p.goto('http://localhost:8790/?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);
// Scroll so the sign-tile-grid top aligns near viewport top
await p.evaluate(() => {
  const grid = document.querySelector('.sign-tile-grid');
  if (grid) { const y = grid.getBoundingClientRect().top + window.scrollY - 120; window.scrollTo(0, y); }
});
await p.waitForTimeout(1000);
await p.screenshot({ path: join(OUT, 'home-twelve-full.png') });
await b.close();
console.log('done');
