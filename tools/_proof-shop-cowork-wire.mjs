/**
 * Proof: v835 authored shop, availability list and truthful no-checkout state.
 */
import { existsSync, readFileSync } from 'node:fs';
import { buildEclipseReading5 } from '../website/js/eclipse-reading.js';

const shop = readFileSync('website/shop.html', 'utf8');
const shopCss = readFileSync('website/css/ap-shop-v835.css', 'utf8');
const app = readFileSync('website/js/app.js', 'utf8');
const eclipse = readFileSync('website/eclipse.html', 'utf8');
const sw = readFileSync('website/sw.js', 'utf8');

const fails = [];
for (const id of ['eclipse-reading', 'deep-reading']) {
  if (!shop.includes('id="' + id + '"')) fails.push('shop missing ' + id + ' edition');
}
for (const art of [
  'img/editorial/eclipse-launch-2026-v835.webp',
  'img/shop/deep-reading-editorial-v835.webp',
  'img/shop/eclipse-set-editorial-v835.webp',
  'img/shop/numbered-sky-plate-v835.webp',
  'img/shop/sky-pass-editorial-v835.webp',
]) {
  if (!shop.includes(art) || !existsSync('website/' + art)) fails.push('shop missing authored art ' + art);
}
if (!/Not for sale today/i.test(shop)) fails.push('shop missing clear no-sale status');
if (!/Five editions\. Free calculation first\./i.test(shop)) fails.push('shop missing launch-edition proposition');
if (!/Planned £2\.99/.test(shop) || !/Planned £14/.test(shop)) fails.push('shop missing planned-price clarity');
if (!/list\.astroprecise\.app\/subscribe/.test(shop)) fails.push('shop missing availability-list endpoint');
if (!/Nothing was saved/.test(shop)) fails.push('shop missing honest subscribe failure state');
if (/(?:gumroad|ap-checkout-honest|REPLACE_ME)/i.test(shop)) fails.push('shop contains a dead checkout path');
if (!/ap-mystic-cards-v835\.js/.test(shop)) fails.push('shop missing art-only spectral interaction');
if (!/\.ap-product__stamp/.test(shopCss)) fails.push('shop stamp selector is not class-scoped');
if (/\.ap-product__image\s+span\s*\{/.test(shopCss)) fails.push('shop retains generic product-image span override');
if (!app.includes("['shop.html', 'Shop']")) fails.push('shared navigation missing Shop');
if (!eclipse.includes('shop.html#eclipse-reading')) fails.push('eclipse missing Shop edition link');
if (typeof buildEclipseReading5 !== 'function') fails.push('eclipse contact engine missing');
if (!/const V\s*=\s*["']ap-v835["']/.test(sw)) fails.push('SW tip is not exactly v835');

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('PASS authored shop + availability list + truthful no-checkout state');
