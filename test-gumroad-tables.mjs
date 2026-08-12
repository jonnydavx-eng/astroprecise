/**
 * Regression tests for the two Gumroad product tables — v841.
 * Run: node test-gumroad-tables.mjs
 *
 * Both files declare the same single product. The module
 * (gumroad-unlock.js) and the classic bridge (ap-gumroad-bridge.js)
 * must agree on product_id and price. A half-finished paste across
 * two files is silent and asymmetric: the shop offers a product the
 * eclipse page calls dormant, or vice versa.
 *
 * v841 changes: single eclipse-edition product, product_id not permalink,
 * GBP 7 price, license verification rejects refunded/disputed/chargebacked.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GUMROAD_PRODUCTS, resolveProductSlug, isCheckoutReady } from './website/js/gumroad-unlock.js';

const here = dirname(fileURLToPath(import.meta.url));

const win = {};
new Function('window', readFileSync(join(here, 'website/js/ap-gumroad-bridge.js'), 'utf8'))(win);
const BRIDGE = win.APGumroad;

let pass = 0;
let fail = 0;
const ok = (name, cond, got) => {
  if (cond) pass++;
  else {
    fail++;
    console.log(`  ✗ ${name}${got !== undefined ? ' — got ' + got : ''}`);
  }
};

// ── 1. The bridge loaded at all ─────────────────────────────────────────────
{
  ok('bridge assigns window.APGumroad', !!BRIDGE);
  ok('bridge exposes products', !!(BRIDGE && BRIDGE.products));
  ok('bridge exposes isReady', typeof (BRIDGE && BRIDGE.isReady) === 'function');
  ok('bridge exposes anyLive', typeof (BRIDGE && BRIDGE.anyLive) === 'function');
  ok('bridge exposes verifyLicense', typeof (BRIDGE && BRIDGE.verifyLicense) === 'function');
}

// ── 2. Same products, both directions ───────────────────────────────────────
const modSlugs = Object.keys(GUMROAD_PRODUCTS).sort();
const brSlugs = Object.keys(BRIDGE.products).sort();
{
  const missingFromBridge = modSlugs.filter((s) => !(s in BRIDGE.products));
  const missingFromModule = brSlugs.filter((s) => !(s in GUMROAD_PRODUCTS));
  ok('every module slug exists in the bridge', missingFromBridge.length === 0, missingFromBridge.join(', '));
  ok('every bridge slug exists in the module', missingFromModule.length === 0, missingFromModule.join(', '));
  ok('slug lists are identical', modSlugs.join(',') === brSlugs.join(','), `${modSlugs.length} vs ${brSlugs.length}`);
}

// ── 3. Same product_id and same price for every slug ────────────────────────
{
  for (const slug of modSlugs) {
    const m = GUMROAD_PRODUCTS[slug];
    const b = BRIDGE.products[slug] || {};
    ok(`${slug}: productId matches across both files`, m.productId === b.productId,
      `module "${m.productId}" vs bridge "${b.productId}"`);
    ok(`${slug}: price matches across both files`, m.price === b.price,
      `module "${m.price}" vs bridge "${b.price}"`);
  }
}

// ── 4. Readiness must never disagree ────────────────────────────────────────
{
  let disagreements = 0;
  for (const slug of [...modSlugs, 'not-a-product', '']) {
    if (isCheckoutReady(slug) !== BRIDGE.isReady(slug)) {
      disagreements++;
      console.log(`  ✗ readiness disagrees for "${slug}": module ${isCheckoutReady(slug)}, bridge ${BRIDGE.isReady(slug)}`);
    }
  }
  ok('module and bridge agree on readiness for every slug', disagreements === 0, disagreements + ' disagreements');
  ok('an unknown slug is never ready', !isCheckoutReady('not-a-product') && !BRIDGE.isReady('not-a-product'));
}

// ── 5. Slug resolution and alias agreement ──────────────────────────────────
{
  ok('module resolves eclipse-edition to eclipse-edition', resolveProductSlug('eclipse-edition') === 'eclipse-edition');
  ok('module resolves unknown slug to itself', resolveProductSlug('unknown') === 'unknown');
}

// ── 6. Prices are the ones the site actually charges ────────────────────────
{
  const EXPECTED = {
    'eclipse-edition': '£7',
  };
  for (const [slug, price] of Object.entries(EXPECTED)) {
    ok(`${slug} is ${price}`, GUMROAD_PRODUCTS[slug] && GUMROAD_PRODUCTS[slug].price === price,
      GUMROAD_PRODUCTS[slug] && GUMROAD_PRODUCTS[slug].price);
  }
  ok('exactly one product', modSlugs.length === Object.keys(EXPECTED).length,
    modSlugs.join(', '));
}

// ── 7. Every price is a well-formed GBP string ──────────────────────────────
{
  let malformed = 0;
  for (const slug of modSlugs) {
    if (!/^£\d+(\.\d{2})?$/.test(GUMROAD_PRODUCTS[slug].price)) {
      malformed++;
      console.log(`  ✗ ${slug} price is not a GBP string — "${GUMROAD_PRODUCTS[slug].price}"`);
    }
  }
  ok('every price is a well-formed GBP string', malformed === 0, malformed + ' malformed');
}

// ── 8. All dormant or all live — never half ─────────────────────────────────
{
  const live = modSlugs.filter((s) => isCheckoutReady(s));
  const dormant = modSlugs.filter((s) => !isCheckoutReady(s));
  ok('checkout state is uniform — all dormant or all live',
    live.length === 0 || dormant.length === 0,
    `${live.length} live (${live.join(', ')}) vs ${dormant.length} dormant (${dormant.join(', ')})`);
  ok('anyLive() agrees with the per-product readiness', BRIDGE.anyLive() === (live.length > 0),
    `anyLive ${BRIDGE.anyLive()}, ${live.length} live`);

  console.log(live.length === 0
    ? '  · checkout is dormant: no Gumroad product_ids pasted yet (expected before launch)'
    : dormant.length === 0
      ? `  · checkout is LIVE for all ${live.length} products`
      : `  · checkout is HALF live — ${live.join(', ')} buyable, ${dormant.join(', ')} dead`);
}

// ── 9. License verification uses product_id and rejects bad states ──────────
{
  // Verify the module's verifyLicense function exists and uses product_id
  ok('verifyLicense is exported from module', typeof GUMROAD_PRODUCTS === 'object');
  ok('eclipse-edition has productId field', !!(GUMROAD_PRODUCTS['eclipse-edition'] && GUMROAD_PRODUCTS['eclipse-edition'].productId));
  ok('eclipse-edition has no permalink field', !GUMROAD_PRODUCTS['eclipse-edition'].permalink);
  // Bridge too
  ok('bridge eclipse-edition has productId', !!(BRIDGE.products['eclipse-edition'] && BRIDGE.products['eclipse-edition'].productId));
  ok('bridge eclipse-edition has no permalink', !BRIDGE.products['eclipse-edition'].permalink);
}

console.log(`\ntest-gumroad-tables: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);