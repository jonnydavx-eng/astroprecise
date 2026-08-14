/**
 * Static proof for the overnight phone look pass.
 * Does not deploy. Does not invent SKUs. Does not rewrite React.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'website');
let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('PASS', msg);
  else { console.error('FAIL', msg); fails++; }
}

const css = readFileSync(join(web, 'css/ap-phone-pass.css'), 'utf8');
ok(!/display:\s*none\s*!important;\s*\/\*\s*2d/.test(css), 'phone CSS does not hide WebGL');
ok(/touch-action:\s*pan-y/.test(css), 'phone stage keeps vertical scroll + orbit');
ok(/min-height:\s*420px/.test(css), 'home stage has a 420px phone floor');
ok(/min-height:\s*380px/.test(css), 'room-sky stage has a 380px phone floor');
ok(/#020307/.test(css) && /#F2ECDF/.test(css) && /#FF6428/.test(css) && /#D8B46A/.test(css),
  'phone pass names the one-house tokens');
ok(/page-sky-card/.test(css), 'phone pass restyles sky-card without a new room');
ok(/ap-keep-row/.test(css) && /#keep-sky/.test(css), 'keep-this-sky is restyled, not rewired');

const pages = {
  'index.html': 'home / observatory',
  'chart.html': 'chart',
  'compatibility.html': 'couples',
  'tonight.html': 'tonight',
  'sky-events.html': 'events',
  'sky-card.html': 'sky-card',
};
for (const [page, label] of Object.entries(pages)) {
  const html = readFileSync(join(web, page), 'utf8');
  const sheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].map((m) => m[0]);
  ok(sheets.some((s) => /ap-phone-pass\.css/.test(s)), label + ' links the phone pass');
  ok(/ap-phone-pass\.css/.test(sheets[sheets.length - 1] || ''), label + ' loads phone pass last');
}

const home = readFileSync(join(web, 'index.html'), 'utf8');
const chart = readFileSync(join(web, 'chart.html'), 'utf8');
const couples = readFileSync(join(web, 'compatibility.html'), 'utf8');
const tonight = readFileSync(join(web, 'tonight.html'), 'utf8');
const skyCard = readFileSync(join(web, 'sky-card.html'), 'utf8');

ok(/data-renderer="webgl-only"/.test(home), 'home keeps webgl-only');
ok(/data-renderer="webgl-only"/.test(chart), 'chart keeps webgl-only');
ok(/data-renderer="webgl-only"/.test(couples), 'couples keeps webgl-only');
ok(/data-renderer="webgl-only"/.test(tonight), 'tonight keeps webgl-only');
ok(!/<void-orrery/.test(readFileSync(join(web, 'sky-events.html'), 'utf8')),
  'events still does not mount a second WebGL');

ok(/background:#020307/.test(skyCard), 'sky-card body is house void');
ok(/btn--draw/.test(skyCard) && /btn--ghost/.test(skyCard), 'sky-card buttons are restyled in CSS');
ok(/:00Z'/.test(skyCard) && /UTC'/.test(skyCard), 'sky-card still reads the clock as UTC');
ok(/a\.download = 'my-sky-card\.png'/.test(skyCard), 'sky-card download path is unchanged');
ok(!/gumroad|sku|checkout|payment/i.test(css), 'phone CSS invents no commerce');

if (fails) process.exit(1);
console.log('PASS phone look static proof');
