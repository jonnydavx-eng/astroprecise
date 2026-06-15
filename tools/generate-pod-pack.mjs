/**
 * POD fulfilment pack — print art + production/shipping memo.
 *
 *   node tools/generate-pod-pack.mjs --in order.json [--final]
 */
import { readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  loadEngines, parseArgs, defaultOutDir, ensureOut, buildChart,
  fmt, esc, slug, PGL, PRINT_CSS, htmlDoc,
} from './fulfil-shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const PRODUCT_LABELS = {
  'natal-poster': 'Natal Sky — Art Poster (A3)',
  'big-three-print': 'Big Three — Mini Print',
  'sky-tee': 'Your Sky — Tee',
  'sky-hoodie': 'Your Sky — Hoodie',
  'constellation-mug': 'Star Map — Mug',
};

const A = parseArgs(process.argv.slice(2));
let order = {};
if (A.in) order = JSON.parse(readFileSync(A.in, 'utf8'));
const FINAL = !!A.final;
const WATERMARK = FINAL ? '' : 'DRAFT';
const OUT = ensureOut(A.out || defaultOutDir());
const product = order.product || 'natal-poster';
const { E } = loadEngines();
const built = buildChart(order, E);
const { order: O, pos, asc } = built;
const s = slug(O.name);

// Spawn existing poster generator for full-wheel art (tee/hoodie/mug/poster reuse same art)
const orderPath = join(OUT, `_pod-${s}.json`);
writeFileSync(orderPath, JSON.stringify({
  name: O.name, date: O.date, time: O.time, place: O.place,
  y: O.y, mo: O.mo, d: O.d, h: O.h, mi: O.mi, lat: O.lat, lon: O.lon, house: O.house,
}, null, 2));
const flags = ['--in', orderPath, '--out', OUT];
if (FINAL) flags.push('--final');
const res = spawnSync(process.execPath, [join(__dir, 'generate-reading.mjs'), ...flags], { stdio: 'pipe', encoding: 'utf8' });
if (res.status !== 0) {
  console.error(res.stderr || res.stdout);
  process.exit(1);
}
console.log(res.stdout.trim());

let artPath = `${OUT}/poster-${s}.html`;
if (product === 'big-three-print') {
  const bigThree = `
<div class="page" style="text-align:center;width:148mm;min-height:210mm;">{{WM}}
  <p class="eyebrow">Big Three</p>
  <h1 style="font-size:22pt;">${esc(O.name)}</h1>
  <p class="meta">${esc(O.date)} · ${esc(O.place)}</p>
  <div class="big3" style="max-width:120mm;margin:10mm auto;">
    <div class="b"><div class="g">${PGL.sun}</div><div class="lbl">Sun</div><div class="v">${fmt(pos.sun.lon)}</div></div>
    <div class="b"><div class="g">${PGL.moon}</div><div class="lbl">Moon</div><div class="v">${fmt(pos.moon.lon)}</div></div>
    <div class="b"><div class="g">↑</div><div class="lbl">Rising</div><div class="v">${fmt(asc)}</div></div>
  </div>
  <p style="margin-top:8mm;font-size:9pt;color:#A89E88;">AstroPrecise · computed from the real sky</p>
</div>`;
  artPath = `${OUT}/big-three-${s}.html`;
  const a3css = PRINT_CSS.replace('size:A4', 'size:A5').replace('width:210mm;min-height:297mm', 'width:148mm;min-height:210mm');
  writeFileSync(artPath, htmlDoc(`Big Three — ${O.name}`, a3css, bigThree, WATERMARK), 'utf8');
  console.log('written:', artPath);
}

const memo = `
<div class="page">{{WM}}
  <p class="eyebrow">Production memo · POD</p>
  <h1 style="font-size:18pt;">${esc(PRODUCT_LABELS[product] || product)}</h1>
  <h2>Order</h2>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>SKU</td><td>${esc(product)}</td></tr>
    <tr><td>Order ID</td><td>${esc(order.orderId || '—')}</td></tr>
    <tr><td>Buyer email</td><td>${esc(order.email || '—')}</td></tr>
    <tr><td>Chart name</td><td>${esc(O.name)}</td></tr>
    <tr><td>Birth</td><td>${esc(O.date)} ${esc(O.time)} · ${esc(O.place)}</td></tr>
  </table>
  <h2>Shipping</h2>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Label name</td><td>${esc(order.shipping_name || O.name)}</td></tr>
    <tr><td>Address</td><td>${esc(order.shipping_address || '—')}</td></tr>
    <tr><td>Phone</td><td>${esc(order.shipping_phone || '—')}</td></tr>
  </table>
  <h2>Art file</h2>
  <p>Print source: <strong>${esc(artPath.split(/[/\\]/).pop())}</strong></p>
  <p>Manual step: upload art to Gelato/Printful (or in-house print queue). Physical pipeline not automated yet.</p>
  <div class="foot"><span>AstroPrecise · POD memo</span><span>${esc(product)}</span><span>1</span></div>
</div>`;

const memoPath = `${OUT}/pod-memo-${s}.html`;
writeFileSync(memoPath, htmlDoc(`POD Memo — ${product}`, PRINT_CSS, memo, WATERMARK), 'utf8');
console.log('written:', memoPath);