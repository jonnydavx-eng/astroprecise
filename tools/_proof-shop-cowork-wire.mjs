/**
 * Proof: v846 authored shop, Eclipse Field Guide, Your Eclipse Edition, availability list and live checkout state.
 */
import { existsSync, readFileSync } from 'node:fs';
import { buildEclipseReading5 } from '../website/js/eclipse-reading.js';

const shop = readFileSync('website/shop.html', 'utf8');
const shopCss = readFileSync('website/css/ap-shop-v835.css', 'utf8');
const app = readFileSync('website/js/app.js', 'utf8');
const eclipse = readFileSync('website/eclipse.html', 'utf8');
const sw = readFileSync('website/sw.js', 'utf8');

const fails = [];
for (const id of ['eclipse-field-guide', 'eclipse-edition']) {
  if (!shop.includes('id="' + id + '"')) fails.push('shop missing ' + id + ' edition');
}
for (const art of [
  'img/editorial/eclipse-field-guide-cover-final-v836.png',
  'img/editorial/eclipse-edition-art-v841.png',
]) {
  if (!shop.includes(art) || !existsSync('website/' + art)) fails.push('shop missing authored art ' + art);
}
if (!/(?:12 Aug edition · £7|Buy the £7 edition|your-eclipse-reading)/i.test(shop)) fails.push('shop missing clear £7 checkout status');
if (!/Cast free contact first|Cast, then unlock|eclipse\.html#contact/i.test(shop)) fails.push('shop missing cast-first funnel into the £7 edition');
if (!/Free first\.[\s\S]*One paid edition\./i.test(shop)) fails.push('shop missing launch-edition proposition');
if (!/£7/.test(shop) || !/Free/.test(shop)) {
  fails.push('shop missing GBP 7 Eclipse Edition and free Field Guide prices');
}
if (!/Your Eclipse Edition/.test(shop) || !/Eclipse Field Guide/.test(shop)) {
  fails.push('shop missing named editions');
}
if (!/list\.astroprecise\.app\/subscribe/.test(shop)) fails.push('shop missing availability-list endpoint');
if (!/Nothing was saved/.test(shop)) fails.push('shop missing honest subscribe failure state');
if (/gumroad\.com\/l\/REPLACE_ME|REPLACE_ME/i.test(shop)) fails.push('shop leaks an unverified checkout path');
if (!/https:\/\/davxplorer3\.gumroad\.com\/l\/your-eclipse-reading/.test(shop)) fails.push('shop missing live Gumroad product path');
if (!/View content/.test(shop)) fails.push('shop missing View content licence-key guidance');
if (!/ap-mystic-cards-v835\.js/.test(shop)) fails.push('shop missing art-only spectral interaction');
if (!/\.ap-product__stamp/.test(shopCss)) fails.push('shop stamp selector is not class-scoped');
if (/\.ap-product__image\s+span\s*\{/.test(shopCss)) fails.push('shop retains generic product-image span override');
if (!app.includes("['shop.html', 'Shop']")) fails.push('shared navigation missing Shop');
if (!eclipse.includes('id="eclipseEdition"')) fails.push('eclipse missing the gated Eclipse Edition host');
if (typeof buildEclipseReading5 !== 'function') fails.push('eclipse contact engine missing');
if (!/const V\s*=\s*["']ap-v865["']/.test(sw)) fails.push('SW tip is not exactly v862');
if (/tags',\s*'checkout-open'/.test(shop)) fails.push('shop notify tag still says checkout-open');
if (!/tags',\s*'eclipse-notes'/.test(shop)) fails.push('shop notify tag must match eclipse-notes copy');
const unlock = readFileSync('website/js/gumroad-unlock.js', 'utf8');
const bridge = readFileSync('website/js/ap-gumroad-bridge.js', 'utf8');
if (!/productId:\s*'3ZwFjg0IW702KvJ5s97QuQ=='/.test(unlock)) fails.push('module productId is not the live Gumroad id');
if (!/productId:\s*'3ZwFjg0IW702KvJ5s97QuQ=='/.test(bridge)) fails.push('bridge productId is not the live Gumroad id');
if (/productId:\s*'30971'/.test(unlock + bridge)) fails.push('stale productId 30971 still present');
if (!/View content/.test(readFileSync('website/js/ap-eclipse-edition-v841.js', 'utf8'))) {
  fails.push('paid edition missing View content licence-key guidance');
}

// Verify exactly two editions referenced in the editions section
const editionCount = (shop.match(/<article class="ap-product/g) || []).length;
if (editionCount !== 2) fails.push(`shop must have exactly 2 edition articles, found ${editionCount}`);

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('PASS Eclipse Field Guide + Your Eclipse Edition shop + availability list + live checkout state');
