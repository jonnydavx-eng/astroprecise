#!/usr/bin/env node
/**
 * Wire Lemon Squeezy checkout URLs + generator status into website/js/app.js.
 *
 *   node tools/wire-ap-mon.mjs
 *   node tools/wire-ap-mon.mjs --from-ls-result tools/commerce-setup-result.json
 *
 * Reads tools/commerce-urls.json (manual paste) or LS result from setup-commerce --apply.
 * Typeform buttons stay in typeform-catalog.json (LS confirmation modal — manual per product).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const APP = join(ROOT, 'website', 'js', 'app.js');
const SW = join(ROOT, 'website', 'sw.js');
const URLS_PATH = join(__dir, 'commerce-urls.json');
const CATALOG_PATH = join(__dir, 'typeform-catalog.json');

const GENERATOR_READY = new Set([
  'deep-reading', 'natal-poster-pdf', 'reading-poster-bundle', 'two-skies-map',
  'gift-reading', 'gift-reading-redeem', 'gift-box-whole-sky',
  'natal-poster', 'big-three-print', 'sky-tee', 'sky-hoodie', 'constellation-mug',
  'year-ahead', 'solar-return',
]);

const TOP_KEYS = {
  'deep-reading': 'deepReadingUrl',
  'natal-poster-pdf': 'posterUrl',
  'gift-reading': 'giftUrl',
};

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from-ls-result' && argv[i + 1]) { a.lsResult = argv[++i]; }
  }
  return a;
}

function loadCheckouts(args) {
  const out = {};
  if (args.lsResult && existsSync(args.lsResult)) {
    const r = JSON.parse(readFileSync(args.lsResult, 'utf8'));
    for (const [id, v] of Object.entries(r.lemonsqueezy || {})) {
      if (v?.checkoutUrl) out[id] = v.checkoutUrl;
    }
  }
  if (existsSync(URLS_PATH)) {
    const u = JSON.parse(readFileSync(URLS_PATH, 'utf8'));
    for (const [id, url] of Object.entries(u.checkout || {})) {
      if (url && /^https?:\/\//i.test(url)) out[id] = url.trim();
    }
  }
  return out;
}

function bumpSw(content) {
  const m = content.match(/const V = '(ap-v\d+)'/);
  if (!m) return content;
  const n = parseInt(m[1].replace('ap-v', ''), 10) + 1;
  return content.replace(m[0], `const V = 'ap-v${n}'`);
}

function setTopUrl(js, key, url) {
  if (!url) return js;
  const re = new RegExp(`(${key}:\\s*)'[^']*'`);
  return js.replace(re, `$1'${url}'`);
}

function patchProduct(js, productId, { fulfilUrl, available }) {
  const blockRe = new RegExp(
    `(\\{\\s*id:\\s*'${productId}'[\\s\\S]*?)(fulfilUrl:\\s*)'[^']*'`,
    'm'
  );
  if (blockRe.test(js) && fulfilUrl) {
    js = js.replace(blockRe, `$1$2'${fulfilUrl}'`);
  }

  // Remove stale available:false and BLOCKED comments for generator-ready SKUs
  if (available) {
    const availRe = new RegExp(
      `(id:\\s*'${productId}',)\\s*available:\\s*false,\\s*(//[^\\n]*\\n\\s*)?`,
      'm'
    );
    js = js.replace(availRe, `$1\n        available:    true,\n        `);

    // Strip obsolete NOTE comment lines inside this product block
    const noteRe = new RegExp(
      `(id:\\s*'${productId}'[\\s\\S]*?)(// NOTE:[^\\n]*\\n\\s*)+`,
      'm'
    );
    js = js.replace(noteRe, '$1');
  }

  // Ensure available:true when missing and generator-ready
  if (available && !new RegExp(`id:\\s*'${productId}'[\\s\\S]*?available:`).test(js)) {
    js = js.replace(
      new RegExp(`(id:\\s*'${productId}',\\s*\\n)`),
      `$1        available:    true,\n`
    );
  }

  return js;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const checkouts = loadCheckouts(args);
  let js = readFileSync(APP, 'utf8');

  for (const [pid, key] of Object.entries(TOP_KEYS)) {
    if (checkouts[pid]) js = setTopUrl(js, key, checkouts[pid]);
  }
  if (checkouts['deep-reading']) js = setTopUrl(js, 'reportUrl', checkouts['deep-reading']);

  for (const pid of GENERATOR_READY) {
    if (pid === 'gift-reading-redeem') continue; // redeem form only — not a shop SKU
    js = patchProduct(js, pid, {
      fulfilUrl: checkouts[pid] || '',
      available: true,
    });
  }

  // Global cleanup: old dormant comments on products still missing available flag
  for (const pid of GENERATOR_READY) {
    if (pid === 'gift-reading-redeem') continue;
    if (!new RegExp(`id:\\s*'${pid}'[\\s\\S]{0,400}available:`).test(js)) {
      js = patchProduct(js, pid, { fulfilUrl: checkouts[pid] || '', available: true });
    }
  }

  writeFileSync(APP, js);
  if (existsSync(SW)) writeFileSync(SW, bumpSw(readFileSync(SW, 'utf8')));

  const wired = Object.keys(checkouts).length;
  console.log(`Patched ${APP}`);
  console.log(`Checkout URLs wired: ${wired}/${GENERATOR_READY.size - 1}`);
  if (wired === 0) {
    console.log('No checkout URLs yet — paste into tools/commerce-urls.json or run:');
    console.log('  LEMONSQUEEZY_API_KEY=... node tools/setup-commerce.mjs --apply');
  }
  if (existsSync(CATALOG_PATH)) {
    const cat = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
    console.log(`Typeform forms: ${cat.forms.length} (LS confirmation buttons → typeform-catalog.json lemon_squeezy_button)`);
  }
}

main();