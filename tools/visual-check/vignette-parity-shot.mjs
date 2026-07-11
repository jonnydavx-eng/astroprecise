// vignette-parity-shot.mjs <tag> — deterministic viewport shots of reference pages
// (animations frozen, starfield hidden) to prove the body::before vignette fix
// does not change the rendered wash on pages that were already correct.
// Usage: node vignette-parity-shot.mjs before|after
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const tag = process.argv[2] || 'before';
const BASE = 'http://localhost:8790';
const OUT = new URL('./out/redesign/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(OUT, { recursive: true });

const PAGES = ['horoscope', 'tonight', 'guides'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();

for (const name of PAGES) {
  await page.goto(`${BASE}/${name}.html`, { waitUntil: 'load' });
  await page.addStyleTag({ content: `
    #starfield-canvas, .starfield-canvas, canvas { visibility: hidden !important; }
    *, *::before, *::after { animation: none !important; transition: none !important; }
  `});
  // let any preloader clear
  await page.waitForFunction(() => !document.body.classList.contains('preloader-active'), null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}vignette-parity-${name}-${tag}.png` });
  console.log(`shot: vignette-parity-${name}-${tag}.png`);
}
await browser.close();
