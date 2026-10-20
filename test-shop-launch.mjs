/**
 * Shop pages are internally consistent while checkout stays closed (owner
 * decision, 20 October 2026). The closed-state rules themselves live in
 * test-checkout-closed.mjs (no price, no buy CTA, coming soon, disclaimer) and
 * test-seller-details.mjs (seller block, no invented company details); this
 * test runs both, then checks what they do not: every local link, image and
 * sample download on shop.html resolves to a real file, and every anchor that
 * points into shop.html, from any page or any script a page loads, lands on an
 * id that exists. Offline; reads files only.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./', import.meta.url));
const site = join(root, 'website');
const read = (p) => readFileSync(join(site, p), 'utf8');
let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('  ok', name); };

for (const script of ['test-checkout-closed.mjs', 'test-seller-details.mjs']) {
  console.log(`-- ${script}`);
  execFileSync(process.execPath, [script], { cwd: root, stdio: 'inherit' });
}
console.log('-- test-shop-launch.mjs');

const shop = read('shop.html');
const pages = readdirSync(site).filter((f) => f.endsWith('.html'));
const ids = new Set([...shop.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]));
const isLocal = (url) => !/^(?:[a-z]+:|\/\/|#)/i.test(url);
const attrUrls = (html, attr) => [...html.matchAll(new RegExp(`\\b${attr}=["']([^"']+)["']`, 'g'))].map((m) => m[1]);

ok('every local link, stylesheet, script and image on shop.html points at a real file', () => {
  const urls = [...attrUrls(shop, 'href'), ...attrUrls(shop, 'src')].filter(isLocal);
  assert.ok(urls.length > 10, 'shop.html should carry its own assets and links');
  for (const url of urls) {
    const file = url.split(/[?#]/)[0];
    assert.ok(existsSync(join(site, file)), `shop.html links to a missing file: ${url}`);
  }
});

ok('each Studio edition on shop.html has its own image and a sample download that exists', () => {
  const cards = [...shop.matchAll(/<article\b[^>]*data-product-sku=["']([^"']+)["'][^>]*>([\s\S]*?)<\/article>/g)];
  assert.ok(cards.length >= 3, 'the three editions must still be listed');
  for (const [, sku, body] of cards) {
    assert.ok(ids.has(sku), `${sku}: card needs an id so links can target it`);
    const img = attrUrls(body, 'src').find((u) => /^img\//.test(u));
    assert.ok(img && existsSync(join(site, img)), `${sku}: sample image missing`);
    const sample = attrUrls(body, 'href').find((u) => /^downloads\/.+\.pdf$/.test(u));
    assert.ok(sample && existsSync(join(site, sample)), `${sku}: sample PDF missing`);
  }
});

ok('every anchor into shop.html, from any page or loaded script, lands on an existing id', () => {
  const scripts = new Set();
  const sources = [];
  for (const page of pages) {
    const html = read(page);
    sources.push([page, html]);
    for (const src of attrUrls(html, 'src')) if (isLocal(src) && /\.js$/.test(src.split(/[?#]/)[0])) scripts.add(src.split(/[?#]/)[0]);
  }
  for (const src of scripts) if (existsSync(join(site, src))) sources.push([src, read(src)]);
  for (const [name, text] of sources) {
    const pattern = name === 'shop.html' ? /href=["'](?:shop\.html)?#([^"'?]+)["']/g : /shop\.html#([A-Za-z0-9_-]+)/g;
    for (const [, frag] of text.matchAll(pattern)) {
      assert.ok(ids.has(frag), `${name} links to shop.html#${frag} but shop.html has no id="${frag}"`);
    }
  }
});

ok('the pages shop.html relies on exist', () => {
  for (const page of ['chart.html', 'contact.html', 'digital-product-terms.html', 'privacy.html', 'terms.html', 'refunds.html']) {
    assert.ok(existsSync(join(site, page)), `missing ${page}`);
  }
});

console.log(`test-shop-launch: ${pass} checks passed (${pages.length} pages scanned)`);
