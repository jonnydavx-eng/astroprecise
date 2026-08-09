/**
 * Regression tests for the two Gumroad product tables.
 * Run: node test-gumroad-tables.mjs
 *
 * The defect this locks out is a FUTURE one, and it is a money defect.
 *
 * The same six products are declared twice, in two files, by hand:
 *   website/js/gumroad-unlock.js   GUMROAD_PRODUCTS  (ES module)
 *   website/js/ap-gumroad-bridge.js  PRODUCTS        (classic script)
 *
 * Both are live and neither is redundant. eclipse.html and deep-reading.html
 * import the module and read `permalink` straight out of it to build the
 * unlock button — that is the £2.99 flow, the only thing with a buyer on
 * 12 August. shop.html cannot use a module, so shop-commerce.js reads
 * window.APGumroad from the bridge instead.
 *
 * So the owner must paste each permalink into TWO files. Paste it into one
 * and the failure is silent and asymmetric: the shop offers a product the
 * eclipse page still calls dormant, or the eclipse page takes money for a
 * product the shop will not sell. Nothing in the build, the linter or the
 * existing suite compares the two tables.
 *
 * These tests do not care what the permalinks ARE. They care that the two
 * files say the same thing — today, while both are REPLACE_ME, and on the
 * day the owner fills them in.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GUMROAD_PRODUCTS, resolveProductSlug, isCheckoutReady } from './website/js/gumroad-unlock.js';

const here = dirname(fileURLToPath(import.meta.url));

// The bridge is a classic script that assigns window.APGumroad. Run it against
// a stub window, exactly as a browser would, so the test reads the shipped
// object rather than a re-parse of the source.
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
}

// ── 2. Same products, both directions ───────────────────────────────────────
// Checked both ways round on purpose: a slug added to one file and not the
// other is the exact mistake this file exists to catch, and it can happen in
// either direction.
const modSlugs = Object.keys(GUMROAD_PRODUCTS).sort();
const brSlugs = Object.keys(BRIDGE.products).sort();
{
  const missingFromBridge = modSlugs.filter((s) => !(s in BRIDGE.products));
  const missingFromModule = brSlugs.filter((s) => !(s in GUMROAD_PRODUCTS));
  ok('every module slug exists in the bridge', missingFromBridge.length === 0, missingFromBridge.join(', '));
  ok('every bridge slug exists in the module', missingFromModule.length === 0, missingFromModule.join(', '));
  ok('slug lists are identical', modSlugs.join(',') === brSlugs.join(','), `${modSlugs.length} vs ${brSlugs.length}`);
}

// ── 3. Same permalink and same price for every slug ─────────────────────────
// This is the assertion that fires on the half-finished paste.
{
  for (const slug of modSlugs) {
    const m = GUMROAD_PRODUCTS[slug];
    const b = BRIDGE.products[slug] || {};
    ok(`${slug}: permalink matches across both files`, m.permalink === b.permalink,
      `module "${m.permalink}" vs bridge "${b.permalink}"`);
    ok(`${slug}: price matches across both files`, m.price === b.price,
      `module "${m.price}" vs bridge "${b.price}"`);
  }
}

// ── 4. Readiness must never disagree ────────────────────────────────────────
// isCheckoutReady() and isReady() are separate implementations of the same
// rule. A buyer sees one page or the other, never both, so a disagreement
// here is invisible in testing and expensive in production.
{
  let disagreements = 0;
  for (const slug of [...modSlugs, 'deep-reading', 'full-reading', 'not-a-product', '']) {
    if (isCheckoutReady(slug) !== BRIDGE.isReady(slug)) {
      disagreements++;
      console.log(`  ✗ readiness disagrees for "${slug}": module ${isCheckoutReady(slug)}, bridge ${BRIDGE.isReady(slug)}`);
    }
  }
  ok('module and bridge agree on readiness for every slug', disagreements === 0, disagreements + ' disagreements');
  ok('an unknown slug is never ready', !isCheckoutReady('not-a-product') && !BRIDGE.isReady('not-a-product'));
}

// ── 5. Alias resolution must agree ──────────────────────────────────────────
// deep-reading and full-reading are one Gumroad product at one price. If only
// one file collapses the alias, a £12 buyer lands on "KEY NOT RECOGNISED".
{
  ok('module resolves deep-reading to full-reading', resolveProductSlug('deep-reading') === 'full-reading');
  ok('bridge resolves deep-reading to full-reading',
    (BRIDGE.products['deep-reading'] || {}).permalink === (BRIDGE.products['full-reading'] || {}).permalink);
  ok('the two £12 slugs carry the same price',
    GUMROAD_PRODUCTS['deep-reading'].price === GUMROAD_PRODUCTS['full-reading'].price,
    `${GUMROAD_PRODUCTS['deep-reading'].price} vs ${GUMROAD_PRODUCTS['full-reading'].price}`);
}

// ── 6. Prices are the ones the site actually charges ────────────────────────
// A previous runbook shipped £29 / £21 / £33 against a site showing £12 / £6 /
// £14. Pinning the table stops a wrong price reaching a checkout page.
{
  const EXPECTED = {
    'eclipse-reading': '£2.99',
    'eclipse-set': '£6',
    'full-reading': '£12',
    'deep-reading': '£12',
    'plate': '£14',
    'sky-pass': '£5',
  };
  for (const [slug, price] of Object.entries(EXPECTED)) {
    ok(`${slug} is ${price}`, GUMROAD_PRODUCTS[slug] && GUMROAD_PRODUCTS[slug].price === price,
      GUMROAD_PRODUCTS[slug] && GUMROAD_PRODUCTS[slug].price);
  }
  ok('no product outside the expected six', modSlugs.length === Object.keys(EXPECTED).length,
    modSlugs.join(', '));
}

// ── 7. Every price is a well-formed GBP string ──────────────────────────────
// Guards the paste that drops the currency symbol or types "2.99£".
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
// This must NOT fail on the day checkout opens; `npm test` gates the deploy,
// so a test that fails on success would block the release it exists to
// protect. All-dormant and all-live are both correct. The defect is the
// in-between: some products buyable and others silently dead, which is what a
// half-finished paste across two files actually looks like.
{
  const live = modSlugs.filter((s) => isCheckoutReady(s));
  const dormant = modSlugs.filter((s) => !isCheckoutReady(s));
  ok('checkout state is uniform across products — all dormant or all live',
    live.length === 0 || dormant.length === 0,
    `${live.length} live (${live.join(', ')}) vs ${dormant.length} dormant (${dormant.join(', ')})`);
  ok('anyLive() agrees with the per-product readiness', BRIDGE.anyLive() === (live.length > 0),
    `anyLive ${BRIDGE.anyLive()}, ${live.length} live`);

  // Informational, not an assertion — tells whoever runs the suite which of
  // the two valid states the site is in right now.
  console.log(live.length === 0
    ? '  · checkout is dormant: no Gumroad permalinks pasted yet (expected before launch)'
    : dormant.length === 0
      ? `  · checkout is LIVE for all ${live.length} products`
      : `  · checkout is HALF live — ${live.join(', ')} buyable, ${dormant.join(', ')} dead`);
}

console.log(`\ntest-gumroad-tables: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
