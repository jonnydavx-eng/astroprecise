#!/usr/bin/env node
/**
 * Pull checkout URLs from existing Lemon Squeezy products → commerce-urls.json → wire app.js
 *
 *   LEMONSQUEEZY_API_KEY=... node tools/sync-lemonsqueezy.mjs
 *   LEMONSQUEEZY_API_KEY=... node tools/sync-lemonsqueezy.mjs --apply
 *
 * LS API cannot CREATE products (405) — create them in the dashboard first, then sync.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const KEY = process.env.LEMONSQUEEZY_API_KEY || '';
const STORE = process.env.LEMONSQUEEZY_STORE_ID || '';
const APPLY = process.argv.includes('--apply');
const RESULT = join(__dir, 'commerce-setup-result.json');
const URLS = join(__dir, 'commerce-urls.json');
const CATALOG = join(__dir, 'typeform-catalog.json');
const SHEET = join(__dir, 'ls-dashboard-setup.txt');

const NAME_TO_SKU = [
  [/deep natal reading|deep reading/i, 'deep-reading'],
  [/print-at-home|natal chart poster.*pdf|poster pdf/i, 'natal-poster-pdf'],
  [/bundle/i, 'reading-poster-bundle'],
  [/two skies|couples/i, 'two-skies-map'],
  [/gift a deep|gift a reading|gift reading/i, 'gift-reading'],
  [/year ahead|transit report/i, 'year-ahead'],
  [/solar return/i, 'solar-return'],
  [/natal sky.*art poster|physical.*poster/i, 'natal-poster'],
  [/big three/i, 'big-three-print'],
  [/sky tee|your sky tee/i, 'sky-tee'],
  [/hoodie/i, 'sky-hoodie'],
  [/mug|star map/i, 'constellation-mug'],
  [/gift box|whole sky/i, 'gift-box-whole-sky'],
];

async function ls(path) {
  const res = await fetch(`https://api.lemonsqueezy.com/v1${path}`, {
    headers: { Authorization: `Bearer ${KEY}`, Accept: 'application/vnd.api+json' },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok) throw new Error(`LS ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

function matchSku(name) {
  for (const [re, sku] of NAME_TO_SKU) if (re.test(name)) return sku;
  return null;
}

function checkoutFromVariant(v, storeSlug = 'astroprecise') {
  const url = v?.attributes?.buy_now_url || v?.attributes?.url;
  if (url) return url;
  if (v?.id) return `https://${storeSlug}.lemonsqueezy.com/checkout/buy/${v.id}`;
  return null;
}

async function main() {
  if (!KEY) {
    console.error('Set LEMONSQUEEZY_API_KEY');
    process.exit(1);
  }

  let storeId = STORE;
  let storeSlug = 'astroprecise';
  if (!storeId) {
    const stores = await ls('/stores');
    const s = stores.data?.[0];
    if (!s) throw new Error('No store found');
    storeId = s.id;
    storeSlug = s.attributes?.slug || storeSlug;
    console.log(`Store: ${s.attributes.name} (${storeId}) — ${s.attributes.url}`);
  }

  const products = await ls(`/products?filter[store_id]=${storeId}&page[size]=50`);
  const rows = [];
  const checkouts = {};
  const lsResult = {};

  for (const p of products.data || []) {
    const variants = await ls(`/products/${p.id}/variants`);
    const v = variants.data?.[0];
    const name = p.attributes.name;
    const sku = matchSku(name);
    const checkout = checkoutFromVariant(v, storeSlug);
    rows.push({ name, sku: sku || '(unmapped)', productId: p.id, variantId: v?.id, price: v?.attributes?.price, checkout });
    if (sku && checkout) {
      checkouts[sku] = checkout;
      lsResult[sku] = { productId: p.id, variantId: v?.id, checkoutUrl: checkout };
    }
  }

  console.log(`\nFound ${rows.length} LS product(s):\n`);
  for (const r of rows) {
    console.log(`  ${r.sku.padEnd(22)} ${r.name}`);
    if (r.checkout) console.log(`    ${r.checkout}`);
  }

  const tf = existsSync(CATALOG) ? JSON.parse(readFileSync(CATALOG, 'utf8')) : { forms: [] };
  const lines = [
    'ASTROPRECISE — LEMON SQUEEZY DASHBOARD SETUP',
    `Store: https://${storeSlug}.lemonsqueezy.com`,
    'Create each product in the dashboard, then run: node tools/sync-lemonsqueezy.mjs --apply',
    '',
    'Per product after publish:',
    '  1. Files → upload tools/NEXT-STEP.pdf',
    '  2. Confirmation modal + Receipt email → button URL below',
    '',
  ];
  for (const f of tf.forms) {
    if (f.product_id === 'gift-reading-redeem') continue;
    lines.push(`--- ${f.product_id} ---`);
    lines.push(`Typeform button (confirmation + receipt):`);
    lines.push(f.lemon_squeezy_button || f.url);
    lines.push('');
  }
  writeFileSync(SHEET, lines.join('\n'), 'utf8');
  console.log(`\nWrote ${SHEET}`);

  const urls = existsSync(URLS) ? JSON.parse(readFileSync(URLS, 'utf8')) : { checkout: {} };
  urls.checkout = { ...urls.checkout, ...checkouts };
  urls.updated_at = new Date().toISOString();
  urls.store_id = storeId;
  writeFileSync(URLS, JSON.stringify(urls, null, 2));

  writeFileSync(RESULT, JSON.stringify({
    created_at: new Date().toISOString(),
    sync: true,
    store_id: storeId,
    products_found: rows.length,
    checkouts_mapped: Object.keys(checkouts).length,
    lemonsqueezy: lsResult,
    unmapped: rows.filter((r) => r.sku === '(unmapped)').map((r) => r.name),
  }, null, 2));

  if (Object.keys(checkouts).length && APPLY) {
    spawnSync(process.execPath, [join(__dir, 'wire-ap-mon.mjs'), '--from-ls-result', RESULT], {
      cwd: ROOT, stdio: 'inherit',
    });
  } else if (!rows.length) {
    console.log('\nNo products in store yet — create them in the LS dashboard, then re-run with --apply');
  } else if (!Object.keys(checkouts).length) {
    console.log('\nProducts found but none mapped to SKUs — rename in LS to match (e.g. "Deep Natal Reading")');
  } else {
    console.log(`\nMapped ${Object.keys(checkouts).length} checkout URL(s). Run with --apply to wire app.js`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });