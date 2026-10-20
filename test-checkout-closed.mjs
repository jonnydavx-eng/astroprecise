/**
 * Checkout is closed (owner decision, 20 October 2026). The public site must
 * say so truthfully: no product price, no buy/checkout CTA, a "coming soon"
 * state on the Studio editions, one shared disclaimer, and an accurate
 * birth-details privacy note. Runs offline against the source files only.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('  ok', name); };

const DISCLAIMER = 'Astrology on AstroPrecise is symbolic and offered for reflection and entertainment. The planetary positions are calculated carefully; the meanings are interpretation, not prediction or advice. Nothing here is medical, financial, legal or psychological advice.';
const FREE_OFFER = /birth chart and seven-chapter (?:sky story|reading) are free/i;
const PRICE = /(?:£|&pound;|GBP\s?)\s?\d/;
const BUY_CTA = /\b(?:buy(?: now)?|order now|pre-?order|add to (?:cart|basket)|checkout now|pay now|purchase)\b/i;
const CHECKOUT_LINK = /gumroad\.com\/(?:l\/|checkout|products?)|checkout\.gumroad\.com|stripe\.com|lemonsqueezy\.com|paypal\.com|ko-fi\.com/i;

// Visible text of every link and button, so copy such as "not ready to buy" is not a false hit.
const ctaTexts = (html) =>
  [...html.matchAll(/<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)].map((m) => m[1].replace(/<[^>]+>/g, ' ').trim());

const shop = read('./website/shop.html');
const chart = read('./website/chart.html');
const privacy = read('./website/privacy.html');
const terms = read('./website/digital-product-terms.html');
const nextFooter = read('./website/js/ap-next.js');
const compactFooter = read('./website/js/ap-footer-inject.js');

ok('shop.html shows no product price', () => {
  assert.equal(PRICE.test(shop), false, 'a £ amount is still visible on shop.html');
  assert.equal(/draft price/i.test(shop), false, 'the "Draft price" label must be gone');
});

ok('shop.html has no buy, order or checkout CTA', () => {
  for (const text of ctaTexts(shop)) assert.equal(BUY_CTA.test(text), false, `buy-style CTA on shop.html: "${text}"`);
  assert.equal(CHECKOUT_LINK.test(shop), false, 'shop.html links to a payment or checkout provider');
  assert.equal(/<form\b|<input\b|<textarea\b|type="email"|mailchimp|buttondown|formspree/i.test(shop), false, 'shop.html must not capture email or run a waitlist');
});

ok('every Studio edition is marked coming soon, not on sale yet', () => {
  const editions = [...shop.matchAll(/data-product-sku=["']([^"']+)["']/g)].map((m) => m[1]);
  assert.ok(editions.length >= 3, 'the three editions must still be listed');
  const states = shop.match(/class="studio-status">Coming soon<span>Not on sale yet<\/span>/g) || [];
  assert.equal(states.length, editions.length, 'each edition needs its own coming-soon state');
  assert.match(shop, /checkout remains closed/i);
  assert.ok((shop.match(/Fictional sample/g) || []).length >= 3, 'sample images keep their Fictional sample label');
});

ok('shop.html states the free chart and reading offer and links to the chart', () => {
  assert.match(shop, FREE_OFFER);
  assert.match(shop, /no account needed/i);
  assert.match(shop, /href="chart\.html"/);
});

ok('shop.html, chart.html and both footers carry the one shared disclaimer', () => {
  for (const [name, source] of [['shop', shop], ['chart', chart], ['ap-next footer', nextFooter], ['compact footer', compactFooter]]) {
    assert.ok(source.includes(DISCLAIMER), `${name} is missing the shared disclaimer`);
  }
});

ok('chart.html introduces the free reading and an accurate birth-details note', () => {
  assert.match(chart, FREE_OFFER);
  assert.match(chart, /Your birth details: your date, time and chart are calculated and kept on this device/);
  assert.match(chart, /Online search sends only the town text to Open-Meteo/);
  assert.equal(PRICE.test(chart), false);
});

ok('privacy.html has a "Your birth details" section that matches the code paths', () => {
  assert.match(privacy, /<h2>Your birth details<\/h2>/);
  assert.match(privacy, /Search more towns online/);
  assert.match(privacy, /sessionStorage/);
  assert.match(privacy, /Legacy order handoff/);
});

ok('the terms draft and the other Studio pages show no price or buy CTA', () => {
  assert.equal(PRICE.test(terms), false, 'digital-product-terms.html still shows a £ price');
  assert.match(terms, /Coming soon/);
  for (const page of ['catalogue', 'sample-reading', 'deep-reading', 'natal-plate', 'refunds']) {
    const html = read(`./website/${page}.html`);
    assert.equal(PRICE.test(html), false, `${page}.html shows a £ price`);
    assert.equal(CHECKOUT_LINK.test(html), false, `${page}.html links to a checkout provider`);
    for (const text of ctaTexts(html)) assert.equal(BUY_CTA.test(text), false, `buy-style CTA on ${page}.html: "${text}"`);
  }
});

ok('the chart page makes no network request except the optional Open-Meteo town search', () => {
  const chartRuntime = read('./website/js/ap-chart-next.js');
  const fetches = [...chartRuntime.matchAll(/fetch\(\s*['"`]([^'"`]+)/g)].map((m) => m[1]);
  assert.deepEqual(fetches, ['https://geocoding-api.open-meteo.com/v1/search?name=']);
  assert.match(chartRuntime, /\$\('search-world'\)\.addEventListener\('click',onlineSearch\)/, 'online search must stay click-triggered');
  assert.equal(/sendBeacon|XMLHttpRequest|WebSocket|gtag|plausible|umami/i.test(chartRuntime + nextFooter), false);
});

console.log(`test-checkout-closed: ${pass} passed`);
