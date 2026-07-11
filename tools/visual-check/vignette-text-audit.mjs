// vignette-text-audit.mjs — audits every page that loads main-lite.css:
// for the hero h1 + nearby text nodes, crops a screenshot to each element's
// box and counts bright (ink-coloured) pixels. The body::before vignette bug
// paints an opaque gradient OVER static-flow text, leaving a flat dark crop
// (near-zero bright pixels). Starfield canvas is hidden during the check so
// stars can't false-pass a covered element. Also collects console errors.
// Usage: node vignette-text-audit.mjs [pageName ...]
import { chromium } from 'playwright';
import { readdirSync, readFileSync } from 'fs';
import { PNG } from 'pngjs';
import { join } from 'path';

const BASE = 'http://localhost:8790';
const SITE = join(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '..', '..', 'website');

let pages = process.argv.slice(2);
if (!pages.length) {
  pages = readdirSync(SITE)
    .filter(f => f.endsWith('.html'))
    .filter(f => readFileSync(join(SITE, f), 'utf8').includes('main-lite.css'))
    .map(f => f.replace(/\.html$/, ''));
}
console.log(`Auditing ${pages.length} pages: ${pages.join(', ')}\n`);

const BRIGHT = 90;      // luminance threshold for "ink" pixels (body ink ~#ECE6D8, brass #C2A05E; wash bg < 45)
const MIN_PIXELS = 30;  // a rendered text run has hundreds of bright pixels

function brightCount(buf) {
  const png = PNG.sync.read(buf);
  let n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const lum = 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
    if (lum > BRIGHT) n++;
  }
  return n;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();

let failures = 0;
const consoleErrs = {};

for (const name of pages) {
  const errs = [];
  const onErr = m => { if (m.type() === 'error') errs.push(m.text()); };
  const onPageErr = e => errs.push(String(e));
  page.on('console', onErr);
  page.on('pageerror', onPageErr);

  try {
    await page.goto(`${BASE}/${name}.html`, { waitUntil: 'load', timeout: 20000 });
    await page.addStyleTag({ content: `
      #starfield-canvas, .starfield-canvas { visibility: hidden !important; }
      *, *::before, *::after { animation: none !important; transition: none !important; }
      body::before { animation: none !important; }
    `});
    await page.waitForFunction(() => !document.body.classList.contains('preloader-active'), null, { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);

    // hero/first-section text candidates: first h1 + text-bearing siblings around it
    // (sign pages put the h1 below a tall art hero — scroll it into view first;
    // the vignette is position:fixed so the check is equivalent anywhere on the page)
    await page.evaluate(() => {
      const h1 = document.querySelector('main h1, h1');
      if (h1 && h1.getBoundingClientRect().top > innerHeight) h1.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(400);
    const targets = await page.evaluate(() => {
      const out = [];
      const h1 = document.querySelector('main h1, h1');
      if (!h1) return out;
      const seen = new Set();
      const add = (el, label) => {
        if (!el || seen.has(el)) return;
        seen.add(el);
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width < 8 || r.height < 8) return;               // not laid out
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
        if (r.bottom < 0 || r.top > innerHeight) return;        // offscreen; only audit above-fold
        if ((el.textContent || '').trim().length < 4) return;
        out.push({ label, x: r.x, y: r.y, w: r.width, h: r.height, text: el.textContent.trim().slice(0, 40) });
      };
      add(h1, 'h1');
      const scope = h1.closest('section, header, .container, main') || h1.parentElement;
      let n = 0;
      for (const el of scope.querySelectorAll('p, .wk-privacy-seal, .lede, .standfirst, [class*="eyebrow"], [class*="sub"], [class*="seal"]')) {
        if (el.querySelector('h1')) continue;
        if (n >= 4) break;
        add(el, el.className || el.tagName.toLowerCase());
        n++;
      }
      return out;
    });

    if (!targets.length) { console.log(`~ ${name}: no hero text targets found (skipped)`); }
    for (const t of targets) {
      const clip = {
        x: Math.max(0, t.x), y: Math.max(0, t.y),
        width: Math.min(t.w, 1440 - Math.max(0, t.x)),
        height: Math.min(t.h, 900 - Math.max(0, t.y)),
      };
      if (clip.width < 8 || clip.height < 8) continue;
      const buf = await page.screenshot({ clip });
      const n = brightCount(buf);
      const ok = n >= MIN_PIXELS;
      if (!ok) failures++;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${name} :: ${t.label} "${t.text}" brightPx=${n}`);
    }
  } catch (e) {
    failures++;
    console.log(`FAIL ${name} :: load error ${e.message.split('\n')[0]}`);
  }

  page.off('console', onErr);
  page.off('pageerror', onPageErr);
  if (errs.length) consoleErrs[name] = errs;
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURES'}`);
const errPages = Object.keys(consoleErrs);
if (errPages.length) {
  console.log('console errors:');
  for (const p of errPages) console.log(`  ${p}: ${consoleErrs[p].slice(0, 3).join(' | ')}`);
} else {
  console.log('console errors: none');
}
process.exit(failures ? 1 : 0);
