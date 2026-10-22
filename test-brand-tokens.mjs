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

// Shell CSS uses the tokens, not the old sage/teal palette.
const OLD = ['#162625', '#f4f1e9', '#d8a461', '#122b2c', '#58625c', '#58635b', '#535f54', '#d4d8ce', '#dce5d6', '#ad6624'];
for (const f of ['ap-next.css', 'ap-intro-next.css', 'ap-chart-next.css', 'ap-discover-next.css', 'ap-contact-next.css']) {
  let css = read(`css/${f}`).toLowerCase();
  if (f === 'ap-next.css') css = css.slice(css.indexOf('/* ap-tokens-end */'));
  const left = OLD.filter((h) => new RegExp(h + '\\b').test(css));
  ok(left.length === 0, `${f} has no old palette hex${left.length ? ' (' + left.join(', ') + ')' : ''}`);
  // Outside the token layer the shell reads only --ap-next-* (defined on
  // :root with literal values), because the dark legacy pages also load the
  // shell CSS and define their own --ap-paper / --ap-line on :root.
  const bare = css.match(/var\(--ap-(paper|paper-2|card|rule|ink|graphite|muted|copper|copper-ink|night|proof|line|radius|hairline|serif|sans)[,)]/g) || [];
  ok(bare.length === 0, `${f} uses only --ap-next-* aliases outside the token layer${bare.length ? ' (' + bare.slice(0, 3).join(', ') + ')' : ''}`);
}

// Logo and favicon are the Paper & Night mark.
const fav = read('favicon.svg');
ok(/#0E1116/i.test(fav) && /#B4693E/i.test(fav) && /#F6F3EC/i.test(fav), 'favicon.svg uses night, copper, paper');
const nav = read('js/ap-next.js');
ok(nav.includes('M32 11A21 21 0 0 1 32 53Z') && !nav.includes('M16 0v32M0 16h32'), 'shell header draws the new mark');
const png = readFileSync(path.join(SITE, 'img/icon-maskable-512.png'));
ok(png.readUInt32BE(16) === 512 && png.readUInt32BE(20) === 512, 'maskable icon is 512x512');

if (fails) { console.error(`\n${fails} brand-token check(s) failed`); process.exit(1); }
console.log('\nbrand tokens: all checks passed');
