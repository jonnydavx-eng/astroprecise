// test-brand-tokens.mjs — Paper & Night step 1–3 guards (tokens, fonts, shell
// palette, logo/favicon). Static checks only; run: node test-brand-tokens.mjs
import { readFileSync, existsSync, statSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const SITE = path.join(path.dirname(new URL(import.meta.url).pathname), 'website');
const read = (p) => readFileSync(path.join(SITE, p), 'utf8');
let fails = 0;
const ok = (cond, msg) => { if (cond) console.log('  ok', msg); else { fails++; console.error('  FAIL', msg); } };

const tokens = read('css/ap-tokens.css');
for (const [name, hex] of [['--ap-paper', '#F6F3EC'], ['--ap-ink', '#0E1116'], ['--ap-copper', '#B4693E']]) {
  ok(new RegExp(`${name}:\\s*${hex}`, 'i').test(tokens), `token ${name} is ${hex}`);
}
for (const url of tokens.match(/url\('\.\.\/fonts\/[^']+'\)/g) || []) {
  const f = url.slice(5, -2).replace('../', '');
  ok(existsSync(path.join(SITE, f)) && statSync(path.join(SITE, f)).size > 4000, `font ${f} exists`);
}
ok(existsSync(path.join(SITE, 'fonts/licenses/OFL-InstrumentSerif.txt')), 'Instrument Serif OFL licence shipped');
ok(/instrument-serif-regular\.woff2/.test(read('fonts/licenses/README.md')), 'licence map lists Instrument Serif');

// The token layer is folded into ap-next.css (one request) and kept in sync.
const sync = spawnSync(process.execPath, [path.join(SITE, '..', 'tools', 'sync-brand-tokens.mjs'), '--check'], { encoding: 'utf8' });
ok(sync.status === 0, 'ap-next.css token layer matches css/ap-tokens.css');
const shell = read('css/ap-next.css');
const layer = shell.slice(0, shell.indexOf('/* AP-TOKENS-END */'));
ok(/^\.ap-next\{--ap-paper:#F6F3EC/m.test(layer) && !/^:root\{--ap-paper/m.test(layer), 'tokens are scoped to body.ap-next, not :root');
ok(!/^(html|h1|a|:focus-visible)\b/m.test(layer), 'no bare element rules leak to dark legacy pages');
const LIGHT = ['chart', 'charts', 'contact', 'deep-reading', 'explore', 'guides', 'index', 'offline', 'shop', 'sky-card', 'sky-events'];
for (const p of LIGHT) {
  const html = read(`${p}.html`);
  ok(/<body[^>]*class="[^"]*ap-next/.test(html) && /css\/ap-next\.css/.test(html), `${p}.html is a body.ap-next shell page`);
  ok(/name="theme-color" content="#F6F3EC"/.test(html), `${p}.html theme-color is paper`);
}

// ---- an independent CSS reader (does not reuse the sync tool's parser) ----
// Returns flat rules: { media: ['@media …', …], sel: 'a,b', body: 'decls' }.
function cssRules(src) {
  src = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const walk = (text, media) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open < 0) break;
      const head = text.slice(i, open).trim();
      let depth = 1, j = open + 1;
      for (; j < text.length && depth; j++) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; }
      const body = text.slice(open + 1, j - 1);
      if (/^@(media|supports|layer)\b/.test(head)) walk(body, [...media, head.replace(/\s+/g, ' ')]);
      else out.push({ media, sel: head.replace(/\s+/g, ' '), body });
      i = j;
    }
  };
  walk(src, []);
  return out;
}
const decls = (body) => Object.fromEntries(body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const k = d.indexOf(':'); return [d.slice(0, k).trim(), d.slice(k + 1).trim()]; }));

// ---- the generated token layer: exact selector allowlist (scope guard) ----
const layerRules = cssRules(layer.slice(layer.indexOf('*/') + 2));
const ALLOWED = new Set(['@font-face', '.ap-next', '.ap-eyebrow', '.ap-num,.ap-deg', '.ap-btn', '.ap-btn--quiet', '.ap-card', '.ap-specimen', '.ap-glyph', '.ap-sky', '.ap-sky a']);
const REDUCED = '@media (prefers-reduced-motion:reduce)';
const REDUCED_SEL = '*,*::before,*::after';
const seen = new Set();
for (const r of layerRules) {
  const where = r.media.join(' ') || 'top level';
  if (r.media.length) {
    const okMedia = r.media.length === 1 && r.media[0].replace(/\s/g, '') === REDUCED.replace(/\s/g, '') && r.sel.replace(/\s/g, '') === REDUCED_SEL;
    ok(okMedia, `token layer media rule is only the reduced-motion reset (${where} ${r.sel})`);
    continue;
  }
  ok(ALLOWED.has(r.sel), `token layer selector "${r.sel}" is on the allowlist`);
  for (const s of r.sel.split(',')) {
    const t = s.trim();
    ok(t === '@font-face' || /^\.[a-z]/.test(t), `token layer selector "${t}" is class-scoped (no :root, element or *)`);
  }
  seen.add(r.sel);
}
for (const s of ALLOWED) ok(seen.has(s), `token layer keeps ${s}`);
ok(layerRules.filter((r) => r.media.length).length === 1, 'token layer has exactly one media rule');

// The component classes (.ap-sky, .ap-specimen, …) are global, but the tokens
// live on .ap-next: every custom property a class reads either has a literal
// fallback or is declared on that rule (.ap-sky declares its night colours).
for (const r of layerRules.filter((x) => x.sel !== '@font-face' && x.sel !== '.ap-next')) {
  const own = new Set(Object.keys(decls(r.body)).filter((k) => k.startsWith('--')));
  if (r.sel.startsWith('.ap-sky ')) for (const k of Object.keys(decls(layerRules.find((x) => x.sel === '.ap-sky').body))) own.add(k);
  const bare = [...r.body.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]).filter((v) => !own.has(v));
  ok(bare.length === 0, `${r.sel} is self-contained outside body.ap-next${bare.length ? ' (reads ' + bare.join(', ') + ' with no fallback)' : ''}`);
}
const skyDecl = decls(layerRules.find((x) => x.sel === '.ap-sky').body);
ok(/^#0E1116$/i.test(skyDecl['--ap-night']) && /^#F1E7CF$/i.test(skyDecl['--ap-starlight']), '.ap-sky declares --ap-night and --ap-starlight');
const spec = decls(layerRules.find((x) => x.sel === '.ap-specimen').body);
ok(/^var\(--ap-copper-ink,#8A4A24\)$/i.test(spec.color), '.ap-specimen small text uses copper-ink, not copper');

// ---- colour maths ----
const hex6 = (h) => { h = h.replace('#', '').toLowerCase(); if (h.length <= 4) h = [...h].map((c) => c + c).join(''); return h; };
const lum = (h) => { const c = [0, 2, 4].map((i) => parseInt(hex6(h).slice(i, i + 2), 16) / 255).map((u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// The complete canonical palette, read from the brand file itself.
const tokenRoot = cssRules(tokens).find((r) => r.sel === ':root' && /--ap-paper:/.test(r.body));
const TOK = {};
for (const [k, v] of Object.entries(decls(tokenRoot.body))) if (/^#[0-9a-f]{6}$/i.test(v)) TOK[k] = v;
const CANON = new Set(Object.values(TOK).map(hex6));
for (const r of cssRules(tokens)) for (const m of r.body.matchAll(/#[0-9a-f]{6}\b/gi)) if (r.sel.startsWith('.ap-sky')) CANON.add(hex6(m[0])); // night-lifted copper link
ok(CANON.size >= 15, `canonical palette read from ap-tokens.css (${CANON.size} colours)`);

// Normalise every colour literal: #rgb #rgba #rrggbb #rrggbbaa rgb() rgba() hsl().
function colourLiterals(css) {
  const lits = [];
  for (const m of css.matchAll(/#[0-9a-f]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/gi)) {
    const t = m[0].toLowerCase();
    let hex, alpha = 1;
    if (t.startsWith('#')) {
      const h = t.slice(1);
      if (![3, 4, 6, 8].includes(h.length)) continue;
      const full = h.length <= 4 ? [...h].map((c) => c + c).join('') : h;
      hex = full.slice(0, 6); if (full.length === 8) alpha = parseInt(full.slice(6), 16) / 255;
    } else if (t.startsWith('rgb')) {
      const n = t.slice(t.indexOf('(') + 1, -1).split(/[\s,/]+/).filter(Boolean);
      hex = n.slice(0, 3).map((x) => Math.round(x.endsWith('%') ? parseFloat(x) * 2.55 : +x).toString(16).padStart(2, '0')).join('');
      if (n[3] !== undefined) alpha = n[3].endsWith('%') ? parseFloat(n[3]) / 100 : +n[3];
    } else { hex = 'hsl'; }
    lits.push({ raw: m[0], hex, alpha });
  }
  return lits;
}
const NAMED = /(?<![\w-])(white|black|red|green|blue|gray|grey|silver|beige|ivory|navy|teal|olive|maroon|tan|wheat|linen|snow|khaki|gold|orange|brown)(?![\w-])/gi;

const SHELL = ['ap-next.css', 'ap-intro-next.css', 'ap-chart-next.css', 'ap-discover-next.css', 'ap-contact-next.css', 'ap-reading-next.css'];
const OLD = ['#162625', '#f4f1e9', '#d8a461', '#122b2c', '#58625c', '#58635b', '#535f54', '#d4d8ce', '#dce5d6', '#ad6624', '#304c43', '#e5e8de', '#24463c', '#b9844d', '#56635d', '#faf8f2', '#a3afa6', '#e8e9df'];
const sw = read('sw.js');
const precache = sw.slice(sw.indexOf('const PRECACHE = ['), sw.indexOf('/* PRECACHE_END */'));
for (const f of SHELL) {
  let raw = read(`css/${f}`);
  if (f === 'ap-next.css') raw = raw.slice(raw.indexOf('/* AP-TOKENS-END */'));
  const rules = cssRules(raw);
  const screen = rules.filter((r) => !r.media.some((m) => /print/.test(m)));
  // Colours: outside the token layer every literal is a canonical palette hex at
  // full opacity; tints are color-mix() over an alias, never a stray hex/rgba.
  const bad = [];
  for (const r of screen) {
    for (const c of colourLiterals(r.body)) if (c.alpha !== 1 || !CANON.has(c.hex)) bad.push(c.raw);
    for (const m of r.body.matchAll(NAMED)) bad.push(m[0]);
  }
  ok(bad.length === 0, `${f} uses only the canonical palette${bad.length ? ' (' + [...new Set(bad)].slice(0, 6).join(', ') + ')' : ''}`);
  const lc = raw.toLowerCase();
  const left = OLD.filter((h) => new RegExp(h + '(?![0-9a-f])').test(lc));
  ok(left.length === 0, `${f} has no old palette hex${left.length ? ' (' + left.join(', ') + ')' : ''}`);
  // Instrument Serif is already narrow: headings keep the brand's -0.015em
  // tracking, not the tighter values tuned for the old display serif.
  const tight = (lc.match(/letter-spacing:\s?-\.0(?:[2-9]|1[6-9])\d*em/g) || []);
  ok(tight.length === 0, `${f} has no heading tracking tighter than -0.015em${tight.length ? ' (' + tight.join(', ') + ')' : ''}`);
  // Outside the token layer the shell reads only --ap-next-* (defined on
  // :root with literal values), because the dark legacy pages also load the
  // shell CSS and define their own --ap-paper / --ap-line on :root.
  const bare = lc.match(/var\(--ap-(paper|paper-2|card|rule|ink|graphite|muted|copper|copper-ink|night|night-2|starlight|proof|alert|line|radius|hairline|serif|sans)[,)]/g) || [];
  ok(bare.length === 0, `${f} uses only --ap-next-* aliases outside the token layer${bare.length ? ' (' + bare.slice(0, 3).join(', ') + ')' : ''}`);
  // Every alias the shell reads is defined (ap-next.css :root).
  // Headings: Instrument Serif has one weight; no faux-bold 500, no old serif var.
  ok(!/var\(--serif\b/.test(raw), `${f} does not read the old --serif (Cormorant) variable`);
  for (const r of rules) {
    if (!/(^|[\s,>])h[1-3]\b/.test(r.sel) && !/\.chart-prompt p\b/.test(r.sel)) continue;
    const d = decls(r.body);
    const fam = d['font-family'] || (d.font && /var\(--ap-next-(serif|sans)/.test(d.font) ? d.font : '');
    const serif = !/--ap-next-sans|AP Sans/.test(fam);
    if (d['font-weight'] && serif && /(^|[\s,>])h[1-3]\b/.test(r.sel)) ok(d['font-weight'] === '400', `${f} ${r.sel.slice(0, 50)} heading weight is 400 (got ${d['font-weight']})`);
    if (/\.chart-prompt p\b/.test(r.sel)) ok(/var\(--ap-next-serif/.test(fam) && (d['font-weight'] || '400') === '400', `${f} .chart-prompt p uses AP Serif at 400`);
  }
  // Every local font the shell CSS loads is in the service-worker precache.
  for (const m of raw.matchAll(/url\(['"]?\.\.\/(fonts\/[^'")]+)['"]?\)/g)) ok(precache.includes(`'./${m[1]}'`), `${f} font ${m[1]} is precached by sw.js`);
}
// The token layer's fonts are precached too (the italic was missing).
for (const m of layer.matchAll(/url\(['"]?\.\.\/(fonts\/[^'")]+)['"]?\)/g)) ok(precache.includes(`'./${m[1]}'`), `token-layer font ${m[1]} is precached by sw.js`);
const aliasRoot = cssRules(shell.slice(shell.indexOf('/* AP-TOKENS-END */'))).find((r) => r.sel === ':root');
const aliases = decls(aliasRoot.body);
const usedAliases = new Set(SHELL.flatMap((f) => [...read(`css/${f}`).matchAll(/var\((--ap-next-[a-z0-9-]+)/g)].map((m) => m[1])));
const RUNTIME = new Set(['--ap-next-tabs-h']); // set from JS (ap-next.js) with a CSS fallback
const undef = [...usedAliases].filter((a) => !(a in aliases) && !RUNTIME.has(a));
ok(undef.length === 0, `every --ap-next-* alias the shell reads is defined on :root${undef.length ? ' (' + undef.join(', ') + ')' : ''}`);
for (const [k, v] of Object.entries(aliases)) if (/^#/.test(v)) ok(CANON.has(hex6(v)), `alias ${k} ${v} is a canonical colour`);

// Buttons on the night story card: copper fill needs ink text (paper on copper is 3.8:1).
const chartCss = read('css/ap-chart-next.css');
const storyBtn = cssRules(chartCss).find((r) => r.sel === '.chart-story-next .button' && !r.media.length);
const sbd = decls(storyBtn.body);
ok(/var\(--ap-next-ink\b/.test(sbd.color) && /!important$/.test(sbd.color), '.chart-story-next .button text is ink and beats the global .button !important');
ok(/var\(--ap-next-accent\b/.test(sbd.background), '.chart-story-next .button is copper');
ok(contrast(TOK['--ap-ink'], TOK['--ap-copper']) >= 4.5, `ink on copper is ${contrast(TOK['--ap-ink'], TOK['--ap-copper']).toFixed(2)}:1 (≥4.5)`);
ok(contrast(TOK['--ap-paper'], TOK['--ap-copper']) < 4.5, 'paper on copper stays below AA (why the story button uses ink)');
ok(contrast(TOK['--ap-copper-ink'], TOK['--ap-paper']) >= 4.5, `copper-ink on paper is ${contrast(TOK['--ap-copper-ink'], TOK['--ap-paper']).toFixed(2)}:1 (≥4.5)`);

// Logo and favicon are the Paper & Night mark.
const fav = read('favicon.svg');
ok(/#0E1116/i.test(fav) && /#B4693E/i.test(fav) && /#F6F3EC/i.test(fav), 'favicon.svg uses night, copper, paper');
const nav = read('js/ap-next.js');
ok(nav.includes('M32 11A21 21 0 0 1 32 53Z') && !nav.includes('M16 0v32M0 16h32'), 'shell header draws the new mark');
const png = readFileSync(path.join(SITE, 'img/icon-maskable-512.png'));
ok(png.readUInt32BE(16) === 512 && png.readUInt32BE(20) === 512, 'maskable icon is 512x512');

if (fails) { console.error(`\n${fails} brand-token check(s) failed`); process.exit(1); }
console.log('\nbrand tokens: all checks passed');
