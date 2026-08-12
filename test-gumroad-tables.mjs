/**
 * Regression gate for AstroPrecise's one Gumroad product.
 * Checkout needs the public permalink; licence verification needs product_id.
 * Neither flow is allowed to become live when only one identifier is configured.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GUMROAD_PRODUCTS,
  isCheckoutReady,
  openCheckout,
  resolveProductSlug,
  verifyLicense,
} from './website/js/gumroad-unlock.js';

const here = dirname(fileURLToPath(import.meta.url));
const moduleSource = readFileSync(join(here, 'website/js/gumroad-unlock.js'), 'utf8');
const bridgeSource = readFileSync(join(here, 'website/js/ap-gumroad-bridge.js'), 'utf8');
const dormantWindow = {};
new Function('window', bridgeSource)(dormantWindow);
const BRIDGE = dormantWindow.APGumroad;

assert.ok(BRIDGE, 'classic bridge must assign window.APGumroad');
for (const method of ['isReady', 'anyLive', 'openCheckout', 'verifyLicense']) {
  assert.equal(typeof BRIDGE[method], 'function', `bridge missing ${method}`);
}

const moduleSlugs = Object.keys(GUMROAD_PRODUCTS).sort();
const bridgeSlugs = Object.keys(BRIDGE.products).sort();
assert.deepEqual(moduleSlugs, ['eclipse-edition']);
assert.deepEqual(bridgeSlugs, moduleSlugs);
for (const slug of moduleSlugs) {
  assert.deepEqual(BRIDGE.products[slug], GUMROAD_PRODUCTS[slug], `${slug} tables diverged`);
  assert.equal(GUMROAD_PRODUCTS[slug].price, '£7');
  assert.ok(Object.hasOwn(GUMROAD_PRODUCTS[slug], 'permalink'));
  assert.ok(Object.hasOwn(GUMROAD_PRODUCTS[slug], 'productId'));
}
assert.equal(resolveProductSlug('eclipse-edition'), 'eclipse-edition');
assert.equal(isCheckoutReady('not-a-product'), false);
assert.equal(BRIDGE.isReady('not-a-product'), false);

// Shipping source is live after both identifiers were verified against the public product page.
assert.equal(GUMROAD_PRODUCTS['eclipse-edition'].permalink, 'your-eclipse-reading');
assert.equal(GUMROAD_PRODUCTS['eclipse-edition'].productId, '3ZwFjg0IW702KvJ5s97QuQ==',
  'License API product_id must match the live Gumroad product page id');
assert.equal(isCheckoutReady('eclipse-edition'), true);
assert.equal(BRIDGE.isReady('eclipse-edition'), true);
assert.equal(BRIDGE.anyLive(), true);
let liveFetchCalled = false;
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => { liveFetchCalled = true; return { ok: true, json: async () => ({ success: true, purchase: {} }) }; };
const liveResult = await verifyLicense('eclipse-edition', '12345678');
assert.equal(liveResult.valid, true);
assert.equal(liveFetchCalled, true, 'configured module must call Gumroad for licence verification');
globalThis.fetch = async () => ({
  ok: false,
  json: async () => ({ success: false, message: 'That license does not exist for the provided product.' }),
});
const failed = await verifyLicense('eclipse-edition', 'BADKEY123456');
assert.equal(failed.valid, false);
assert.match(failed.reason || '', /license does not exist/i);
globalThis.fetch = previousFetch;

// Exercise a configured copy of the classic bridge so identifier routing is
// proven, not just searched for as a string.
const configuredSource = bridgeSource
  .replace("permalink: 'your-eclipse-reading'", "permalink: 'public-eclipse-slug'")
  .replace("productId: '3ZwFjg0IW702KvJ5s97QuQ=='", "productId: 'product_api_123'");
const requests = [];
const configuredWindow = {
  location: { href: '' },
  fetch: async (url, options) => {
    requests.push({ url, options });
    return { json: async () => ({ success: true, purchase: {} }) };
  },
};
new Function('window', 'fetch', configuredSource)(configuredWindow, configuredWindow.fetch);
const LIVE = configuredWindow.APGumroad;
assert.equal(LIVE.isReady('eclipse-edition'), true);
assert.equal(LIVE.openCheckout('eclipse-edition'), true);
assert.equal(configuredWindow.location.href,
  'https://gumroad.com/l/public-eclipse-slug?wanted=true',
  'checkout must use the public permalink');
assert.equal(configuredWindow.location.href.includes('product_api_123'), false);
assert.deepEqual(await LIVE.verifyLicense('licence-key-123', 'eclipse-edition'), { valid: true });
assert.equal(requests.length, 1);
assert.equal(requests[0].url, 'https://api.gumroad.com/v2/licenses/verify');
assert.match(requests[0].options.body, /product_id=product_api_123/);
assert.equal(requests[0].options.body.includes('public-eclipse-slug'), false,
  'licence verification must not use the public permalink');

for (const state of ['refunded', 'disputed', 'chargebacked']) {
  const blockedWindow = {
    location: { href: '' },
    fetch: async () => ({ json: async () => ({ success: true, purchase: { [state]: true } }) }),
  };
  new Function('window', 'fetch', configuredSource)(blockedWindow, blockedWindow.fetch);
  const result = await blockedWindow.APGumroad.verifyLicense('licence-key-123', 'eclipse-edition');
  assert.equal(result.valid, false, `${state} purchase must be rejected`);
}

for (const source of [moduleSource, bridgeSource]) {
  assert.ok(source.includes('product_id'), 'licence code must name product_id');
  assert.ok(source.includes('permalink'), 'checkout code must name permalink');
  assert.equal(/handleUnlockOnLoad|searchParams\.get\(['"]license|[?&]license=/.test(source), false,
    'licence keys must never be accepted from the URL');
}

console.log('PASS live two-identifier Gumroad gate + checkout/licence routing + bad-state rejection');
