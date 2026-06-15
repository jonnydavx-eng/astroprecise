#!/usr/bin/env node
/** Sync shop.html static LS links from tools/commerce-urls.json */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const urls = JSON.parse(readFileSync(join(root, 'tools', 'commerce-urls.json'), 'utf8')).checkout;
const shopPath = join(root, 'website', 'shop.html');
let html = readFileSync(shopPath, 'utf8');

const LS_HREF = 'https://astroprecise\\.lemonsqueezy\\.com/checkout/[^"]+';

/** Replace checkout href inside a featured <article data-product-id="…"> only. */
function patchFeatured(productId, url) {
  const re = new RegExp(
    `(<article[^>]*data-product-id="${productId}"[\\s\\S]*?href=")${LS_HREF}(")`,
  );
  if (!re.test(html)) {
    console.warn('missing featured article:', productId);
    return;
  }
  html = html.replace(re, `$1${url}$2`);
  console.log('patched featured:', productId);
}

/** Replace checkout href on the trending card that contains a given product image. */
function patchTrending(imgFile, url) {
  const marker = `img/shop/${imgFile}`;
  const imgIdx = html.indexOf(marker);
  if (imgIdx === -1) {
    console.warn('missing trending card:', imgFile);
    return;
  }
  const slice = html.slice(0, imgIdx);
  const hrefNeedle = 'href="https://astroprecise.lemonsqueezy.com/checkout/';
  const hrefIdx = slice.lastIndexOf(hrefNeedle);
  if (hrefIdx === -1) {
    console.warn('missing trending href:', imgFile);
    return;
  }
  const start = hrefIdx + 'href="'.length;
  const end = html.indexOf('"', start);
  html = html.slice(0, start) + url + html.slice(end);
  console.log('patched trending:', imgFile);
}

patchFeatured('deep-reading', urls['deep-reading']);
patchFeatured('reading-poster-bundle', urls['reading-poster-bundle']);
patchFeatured('natal-poster-pdf', urls['natal-poster-pdf']);
patchTrending('product-year-ahead.jpg', urls['year-ahead']);
patchTrending('product-two-skies.jpg', urls['two-skies-map']);
patchTrending('product-solar-return.jpg', urls['solar-return']);

writeFileSync(shopPath, html);
console.log('shop.html checkout links synced');