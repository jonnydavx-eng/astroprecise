#!/usr/bin/env node
/**
 * Route a fulfilment order (or Typeform response) to the correct generator.
 *
 *   node tools/fulfil-order.mjs --in order.json [--final]
 *   node tools/fulfil-order.mjs --typeform response.json [--final]
 *   node tools/fulfil-order.mjs --product deep-reading --in order.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseArgs, defaultOutDir, slug, isPaidOrder } from './fulfil-shared.mjs';
import { typeformToOrder, resolveCoordinates } from './typeform-to-order.mjs';
import { validateBirthData, validatePaidOutputs, PAID_DELIVERABLES } from './fulfil-quality.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));

const ROUTES = {
  'deep-reading': { script: 'generate-reading.mjs', kind: 'natal' },
  'natal-poster-pdf': { script: 'generate-reading.mjs', kind: 'natal' },
  'reading-poster-bundle': { script: 'generate-reading.mjs', kind: 'natal' },
  'gift-reading-redeem': { script: 'generate-reading.mjs', kind: 'natal' },
  'two-skies-map': { script: 'generate-couples.mjs', kind: 'couples' },
  'gift-reading': { script: 'generate-gift-voucher.mjs', kind: 'gift' },
  'gift-box-whole-sky': { script: 'generate-gift-voucher.mjs', kind: 'gift-box' },
  'natal-poster': { script: 'generate-pod-pack.mjs', kind: 'pod' },
  'big-three-print': { script: 'generate-pod-pack.mjs', kind: 'pod' },
  'sky-tee': { script: 'generate-pod-pack.mjs', kind: 'pod' },
  'sky-hoodie': { script: 'generate-pod-pack.mjs', kind: 'pod' },
  'constellation-mug': { script: 'generate-pod-pack.mjs', kind: 'pod' },
  'year-ahead': { script: 'generate-year-ahead.mjs', kind: 'natal' },
  'solar-return': { script: 'generate-solar-return.mjs', kind: 'natal' },
};

function runScript(script, args) {
  const res = spawnSync(process.execPath, [join(__dir, script), ...args], {
    stdio: 'inherit',
    cwd: join(__dir, '..'),
  });
  if (res.status !== 0) process.exit(res.status || 1);
}

function orderToNatalJson(order) {
  return {
    name: order.name,
    date: order.date,
    time: order.time,
    place: order.place,
    y: order.y, mo: order.mo, d: order.d,
    h: order.h, mi: order.mi,
    lat: order.lat, lon: order.lon,
    house: order.house || 'placidus',
    orderId: order.orderId,
    product: order.product,
    email: order.email,
    shipping_name: order.shipping_name,
    shipping_address: order.shipping_address,
    shipping_phone: order.shipping_phone,
  };
}

function main() {
  const A = parseArgs(process.argv.slice(2));
  let order;
  if (A.typeform) {
    order = resolveCoordinates(typeformToOrder(JSON.parse(readFileSync(A.typeform, 'utf8'))));
  } else if (A.in) {
    order = resolveCoordinates(JSON.parse(readFileSync(A.in, 'utf8')));
  } else {
    console.error('Usage: fulfil-order.mjs --in order.json | --typeform response.json [--final] [--out dir]');
    process.exit(1);
  }

  const product = A.product || order.product;
  if (!product) {
    console.error('No product_sku — pass --product or include product in order JSON');
    process.exit(1);
  }
  const route = ROUTES[product];
  if (!route) {
    console.error(`Unknown product_sku: ${product}`);
    process.exit(1);
  }

  if (route.kind === 'natal' || route.kind === 'couples') {
    const birthCheck = route.kind === 'couples'
      ? (() => {
          const p1 = validateBirthData(order.p1 || {});
          const p2 = validateBirthData(order.p2 || {});
          const missing = [...(p1.ok ? [] : p1.missing.map((m) => `p1.${m}`)), ...(p2.ok ? [] : p2.missing.map((m) => `p2.${m}`))];
          return { ok: missing.length === 0, missing };
        })()
      : validateBirthData(order);
    if (!birthCheck.ok) {
      console.error('Birth data incomplete — cannot produce paid-quality chart:', birthCheck.missing.join(', '));
      process.exit(1);
    }
  }

  const outDir = A.out || defaultOutDir();
  mkdirSync(outDir, { recursive: true });
  const tmpPath = join(outDir, `_order-${slug(product)}.json`);
  const flags = ['--in', tmpPath, '--out', outDir];
  const paidFinal = !!(A.final || isPaidOrder(order));
  if (paidFinal) flags.push('--final');

  if (route.kind === 'couples') {
    writeFileSync(tmpPath, JSON.stringify({ p1: order.p1, p2: order.p2, orderId: order.orderId, product }, null, 2));
  } else if (route.kind === 'gift' || route.kind === 'gift-box') {
    writeFileSync(tmpPath, JSON.stringify({ ...order, product, giftBox: route.kind === 'gift-box' }, null, 2));
  } else if (route.kind === 'pod') {
    writeFileSync(tmpPath, JSON.stringify({ ...orderToNatalJson({ ...order, product }), product }, null, 2));
  } else {
    writeFileSync(tmpPath, JSON.stringify(orderToNatalJson({ ...order, product }), null, 2));
  }

  console.log(`Fulfil: ${product} → ${route.script}${paidFinal ? ' (paid — FINAL)' : ' (proof)'}`);
  runScript(route.script, flags);

  if (PAID_DELIVERABLES[product]) {
    const q = validatePaidOutputs({ product, outDir, final: paidFinal });
    for (const w of q.warnings) console.warn('Quality warn:', w);
    if (!q.ok) {
      for (const e of q.errors) console.error('Quality FAIL:', e);
      process.exit(1);
    }
    console.log('Quality PASS:', q.files.join(', '));
  }
}

main();