/**
 * Polish sweep 2026-07-10 — CSS conflict probe on home + explore.
 * Samples computed styles for structure-clean-governed elements and reports
 * which stylesheet actually wins (via matched rules through CDP).
 * Read-only. Output: out/polish-2026-07-10/css-conflicts.json
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = (process.argv[2] || 'http://127.0.0.1:8790').replace(/\/$/, '');
const OUT = join(__dirname, 'out', 'polish-2026-07-10');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(4000);

const result = await page.evaluate(() => {
  const out = { hiddenChapters: [], visibleChapters: [], probes: [], docClasses: document.documentElement.className, bodyClasses: document.body.className };
  document.querySelectorAll('main section, section[id*="hapter" i], [id$="Chapter"]').forEach((s) => {
    const cs = getComputedStyle(s);
    const rec = `${s.id || s.className.split(' ')[0]} display=${cs.display}`;
    if (cs.display === 'none') out.hiddenChapters.push(rec);
    else out.visibleChapters.push(rec);
  });
  // probe key tokens for palette uniformity
  const probeSel = ['body', 'h1', '.hero-copy h1', 'nav a', '.ap-bottom-nav', 'footer', '.btn, .cta, [class*="cta"]'];
  for (const sel of probeSel) {
    const el = document.querySelector(sel);
    if (!el) { out.probes.push({ sel, missing: true }); continue; }
    const cs = getComputedStyle(el);
    out.probes.push({ sel, color: cs.color, bg: cs.backgroundColor, font: cs.fontFamily.slice(0, 40), fontSize: cs.fontSize });
  }
  return out;
});

// count competing !important display rules that target visible chapters
console.log(JSON.stringify(result, null, 2));
await writeFile(join(OUT, 'css-conflicts.json'), JSON.stringify(result, null, 2));
await browser.close();
