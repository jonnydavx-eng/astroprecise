// test-brand-computed.mjs — Paper & Night computed-style checks in a real
// browser: .ap-sky on a page without body.ap-next, button contrast, heading
// weights and the specimen mark. Needs Chrome (CHROME_PATH or a system
// Chrome); skips locally without one, fails in CI (CI=true) without one.
import { chromium } from 'playwright-core';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'website');
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
if (!CHROME) {
  if (process.env.CI) { console.error('brand computed: no Chrome found (set CHROME_PATH)'); process.exit(1); }
  console.log('brand computed: SKIP (no Chrome; set CHROME_PATH)'); process.exit(0);
}
let fails = 0;
const ok = (cond, msg) => { if (cond) console.log('  ok', msg); else { fails++; console.error('  FAIL', msg); } };
const css = (f) => `<link rel="stylesheet" href="${pathToFileURL(path.join(SITE, 'css', f)).href}">`;
const dir = mkdtempSync(path.join(tmpdir(), 'ap-brand-'));
const pages = {
  legacy: `<!doctype html><html><head>${css('ap-next.css')}</head><body><div class="ap-sky" id="sky"><a id="skya" href="#">night link</a></div><span class="ap-specimen" id="spec">SPECIMEN</span></body></html>`,
  shell: `<!doctype html><html><head>${css('ap-next.css')}${css('ap-chart-next.css')}</head><body class="ap-next"><div class="ap-sky" id="sky">x</div><span class="ap-specimen" id="spec">SPECIMEN</span><main class="chart-page"><h1 id="ch1">Chart</h1><div class="chart-prompt"><p id="prompt">Prompt</p></div><div class="chart-story-next"><a class="button" id="story" href="#">Read the story</a></div><a class="button" id="btn" href="#">Plain</a></main></body></html>`,
  discover: `<!doctype html><html><head>${css('ap-next.css')}${css('ap-discover-next.css')}</head><body class="ap-next"><main class="ap-discover"><h1 id="dh1">Explore</h1><h2 id="dh2">Two</h2></main></body></html>`,
};
const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const lum = (c) => { const v = c.map((u) => u / 255).map((u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
try {
  const page = await browser.newPage();
  const open = async (name) => { const f = path.join(dir, name + '.html'); writeFileSync(f, pages[name]); await page.goto(pathToFileURL(f).href); };
  const cs = (id, props) => page.evaluate(([id, props]) => { const s = getComputedStyle(document.getElementById(id)); return Object.fromEntries(props.map((p) => [p, s.getPropertyValue(p)])); }, [id, props]);

  for (const name of ['legacy', 'shell']) {
    await open(name);
    const sky = await cs('sky', ['background-color', 'color']);
    ok(sky['background-color'] === 'rgb(14, 17, 22)', `${name}: .ap-sky background is night (${sky['background-color']})`);
    ok(sky.color === 'rgb(241, 231, 207)', `${name}: .ap-sky text is starlight (${sky.color})`);
    const spec = await cs('spec', ['color']);
    ok(spec.color === 'rgb(138, 74, 36)', `${name}: .ap-specimen is copper-ink (${spec.color})`);
  }
  await open('legacy');
  ok((await cs('skya', ['color'])).color === 'rgb(226, 162, 122)', 'legacy: .ap-sky a is night copper');
  ok(!(await page.evaluate(() => document.body.classList.contains('ap-next'))), 'legacy page has no body.ap-next');

  await open('shell');
  for (const id of ['story', 'btn']) {
    const b = await cs(id, ['color', 'background-color']);
    const c = contrast(rgb(b.color), rgb(b['background-color']));
    ok(c >= 4.5, `${id === 'story' ? '.chart-story-next .button' : '.button'} text contrast ${c.toFixed(2)}:1 (${b.color} on ${b['background-color']})`);
  }
  for (const id of ['ch1', 'prompt']) {
    const h = await cs(id, ['font-family', 'font-weight']);
    ok(/AP Serif/.test(h['font-family']) && h['font-weight'] === '400', `chart #${id} is AP Serif 400 (${h['font-family'].slice(0, 30)} ${h['font-weight']})`);
  }
  await open('discover');
  for (const id of ['dh1', 'dh2']) {
    const h = await cs(id, ['font-family', 'font-weight']);
    ok(/AP Serif/.test(h['font-family']) && h['font-weight'] === '400', `discover #${id} is AP Serif 400 (${h['font-weight']})`);
  }
} finally {
  await browser.close();
  rmSync(dir, { recursive: true, force: true });
}
if (fails) { console.error(`\n${fails} brand computed check(s) failed`); process.exit(1); }
console.log('\nbrand computed: all checks passed');
