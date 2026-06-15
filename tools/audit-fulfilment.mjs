#!/usr/bin/env node
/**
 * Fulfilment suite audit — verify every Typeform SKU has a working generator.
 *
 *   node tools/audit-fulfilment.mjs
 */
import { readFileSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const catalog = JSON.parse(readFileSync(join(__dir, 'typeform-catalog.json'), 'utf8'));
const OUT = join(__dir, '_audit-out');
mkdirSync(OUT, { recursive: true });

const SAMPLE_NATAL = {
  name: 'Jane Example',
  date: '15 Mar 1990',
  time: '14:30',
  place: 'London, England',
  y: 1990, mo: 3, d: 15, h: 14, mi: 30,
  lat: 51.5074, lon: -0.1278,
  house: 'placidus',
  orderId: 'AUDIT-001',
  email: 'audit@example.com',
  shipping_name: 'Jane Example',
  shipping_address: '1 Test St, London, UK',
};

const SAMPLE_COUPLES = {
  orderId: 'AUDIT-002',
  product: 'two-skies-map',
  p1: { name: 'Aurora', date: '14 June 1990', time: '03:42', place: 'Whitby, England', y: 1990, mo: 6, d: 14, h: 2, mi: 42, lat: 54.486, lon: -0.613 },
  p2: { name: 'Orion', date: '2 March 1988', time: '17:10', place: 'Bath, England', y: 1988, mo: 3, d: 2, h: 17, mi: 10, lat: 51.381, lon: -2.359 },
};

const SAMPLE_GIFT = {
  product: 'gift-reading',
  orderId: 'AUDIT-GIFT-001',
  buyer_name: 'Buyer',
  recipient_name: 'Recipient',
  recipient_email: 'recipient@example.com',
  gift_message: 'Happy birthday!',
};

function writeJson(name, data) {
  const p = join(OUT, name);
  writeFileSync(p, JSON.stringify(data, null, 2));
  return p;
}

function runFulfil(product, orderPath) {
  const res = spawnSync(process.execPath, [
    join(__dir, 'fulfil-order.mjs'),
    '--in', orderPath,
    '--product', product,
    '--out', OUT,
  ], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  return { ok: res.status === 0, stdout: res.stdout, stderr: res.stderr };
}

function expectFiles(patterns) {
  const files = readdirSync(OUT);
  const missing = patterns.filter((pat) => !files.some((f) => f.includes(pat)));
  return { ok: missing.length === 0, missing, files };
}

const rows = [];
let pass = 0;
let fail = 0;

for (const form of catalog.forms) {
  const pid = form.product_id;
  let orderPath;
  let expected = [];

  if (form.template === 'couples') {
    orderPath = writeJson(`order-${pid}.json`, { ...SAMPLE_COUPLES, product: pid });
    expected = ['couples-', 'twoskies-'];
  } else if (form.template === 'gift-purchase') {
    orderPath = writeJson(`order-${pid}.json`, { ...SAMPLE_GIFT, product: pid });
    expected = ['voucher-'];
  } else if (form.template === 'gift-redeem' || form.template === 'natal-single') {
    orderPath = writeJson(`order-${pid}.json`, { ...SAMPLE_NATAL, product: pid });
    if (pid === 'solar-return') expected = ['solar-return-'];
    else if (pid === 'year-ahead') expected = ['year-ahead-'];
    else if (pid === 'natal-poster-pdf') expected = ['poster-'];
    else if (pid === 'deep-reading' || pid === 'gift-reading-redeem') expected = ['reading-'];
    else if (pid === 'reading-poster-bundle') expected = ['reading-', 'poster-'];
    else expected = ['reading-', 'poster-'];
  } else if (form.template === 'pod-natal') {
    orderPath = writeJson(`order-${pid}.json`, { ...SAMPLE_NATAL, product: pid });
    expected = pid === 'big-three-print' ? ['big-three-', 'pod-memo-'] : ['poster-', 'pod-memo-'];
  } else {
    rows.push({ pid, status: form.status, generator: form.generator, result: 'SKIP', detail: 'unknown template' });
    continue;
  }

  const run = runFulfil(pid, orderPath);
  const files = run.ok ? expectFiles(expected) : { ok: false, missing: expected, files: [] };
  const ok = run.ok && files.ok;
  if (ok) pass++; else fail++;

  rows.push({
    pid,
    status: form.status,
    generator: form.generator || '(routed)',
    result: ok ? 'PASS' : 'FAIL',
    detail: !run.ok ? (run.stderr || run.stdout || 'spawn failed').trim().split('\n').pop()
      : !files.ok ? `missing: ${files.missing.join(', ')}` : files.files.filter((f) => expected.some((e) => f.includes(e))).join(', '),
  });
}

console.log('\nAstroPrecise fulfilment audit\n');
console.log('Product'.padEnd(22), 'Catalog'.padEnd(8), 'Result'.padEnd(6), 'Detail');
console.log('-'.repeat(80));
for (const r of rows) {
  console.log(r.pid.padEnd(22), r.status.padEnd(8), r.result.padEnd(6), (r.detail || '').slice(0, 40));
}
console.log('-'.repeat(80));
console.log(`${pass} passed, ${fail} failed (${rows.length} products)\n`);

const report = {
  audited_at: new Date().toISOString(),
  pass,
  fail,
  rows,
  out_dir: OUT,
};
writeFileSync(join(__dir, 'fulfilment-audit.json'), JSON.stringify(report, null, 2));
console.log('Report:', join(__dir, 'fulfilment-audit.json'));

process.exit(fail ? 1 : 0);