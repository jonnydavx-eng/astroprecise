/** Proof: v899 voluntary-support shop and archived entitlement recovery. */
import { existsSync, readFileSync } from 'node:fs';

const shop = readFileSync('website/shop.html', 'utf8');
const app = readFileSync('website/js/app.js', 'utf8');
const unlock = readFileSync('website/js/gumroad-unlock.js', 'utf8');
const bridge = readFileSync('website/js/ap-gumroad-bridge.js', 'utf8');
const edition = readFileSync('website/js/ap-eclipse-edition-v841.js', 'utf8');
const affiliate = readFileSync('website/js/affiliate-social.js', 'utf8');
const terms = readFileSync('website/terms.html', 'utf8');
const captureSurfaces = ['links.html', 'profile.html', 'saturn-return.html']
  .map(file => [file, readFileSync('website/' + file, 'utf8')]);
const sw = readFileSync('website/sw.js', 'utf8');
const fails = [];

for (const file of [
  'website/downloads/astroprecise-eclipse-field-guide-2026.pdf',
  'website/img/editorial/eclipse-field-guide-cover-final-v836.png',
  'website/img/editorial/eclipse-edition-art-v841.png',
  'website/img/engine/earth.webp',
]) if (!existsSync(file)) fails.push('missing authored asset ' + file);

if (!/class="ap-surface-a"/.test(shop) || !/img\/engine\/earth\.webp/.test(shop)) {
  fails.push('shop missing honest clean Surface A model still');
}
if (!/https:\/\/ko-fi\.com\/astroprecise/.test(shop) || !/Voluntary support/.test(shop)) {
  fails.push('shop missing voluntary Ko-fi support route');
}
if (!/no product checkout is linked or opened on AstroPrecise/i.test(shop)) fails.push('shop does not state the local product-checkout boundary');
if (!/Optional Ko-fi support requires an email/i.test(shop) || !/connected PayPal or Stripe account/i.test(shop)) {
  fails.push('shop does not disclose the support email and payment route');
}
if (/(?:£7|Buy now|gumroad\.com\/l\/|checkout-open)/i.test(shop)) fails.push('shop still presents stale product checkout copy');
if (/list\.astroprecise\.app\/subscribe/.test(shop) || /<form[^>]+subscribe/i.test(shop)) {
  fails.push('shop retains an unverified email-capture endpoint');
}
if (!/Email updates are paused/.test(shop)) fails.push('shop missing honest email-pause state');
if (!/emailCaptureEnabled:\s*false/.test(app) || /list\.astroprecise\.app|function captureEmail/.test(app)) {
  fails.push('site-wide email capture is not hard-paused');
}
for (const [file, html] of captureSurfaces) {
  if (/ap-email-cta__form|cw-waitlist__form/.test(html)) {
    fails.push(file + ' still exposes an email signup form');
  }
}
if (!/adsEnabled:\s*false/.test(app) || !/aff\.adsEnabled !== true \|\| !amazonTag\(\)/.test(affiliate)) {
  fails.push('affiliate inventory can render without verified configuration');
}
if (!/No affiliate programme is active today\./.test(terms)) {
  fails.push('terms still imply an active affiliate programme');
}
if (!/catalogueSkus:\s*\[\s*\]/.test(app) || !/price:\s*null/.test(app)) {
  fails.push('public app catalogue still contains a live SKU or price');
}

for (const [name, source] of [['module', unlock], ['bridge', bridge]]) {
  if (!/checkoutEnabled:\s*false/.test(source)) fails.push(name + ' checkout is not explicitly disabled');
  if (!/archived:\s*true/.test(source)) fails.push(name + ' product is not marked archived');
  if (!/productId:\s*'3ZwFjg0IW702KvJ5s97QuQ=='/.test(source)) fails.push(name + ' lost the historic entitlement product id');
  if (!/isEntitlementReady/.test(source)) fails.push(name + ' cannot verify past-buyer entitlement');
}
if (!/verifyLicense/.test(unlock) || !/api\.gumroad\.com\/v2\/licenses\/verify/.test(unlock)) {
  fails.push('past-buyer licence verification is no longer wired');
}
if (/openCheckout\s*\(/.test(edition)) fails.push('archived edition can still call checkout');
if (!/event edition is closed|past buyer/i.test(edition)) fails.push('edition recovery copy does not explain archive/past-buyer state');
if (!/const V\s*=\s*["']ap-v899["']/.test(sw)) fails.push('SW tip is not ap-v899');

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('PASS voluntary support + archived checkout + past-buyer recovery');
