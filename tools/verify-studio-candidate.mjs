/** Bounded built-Studio check. No orders, account access or product rendering. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const output = resolve(root, 'output/playwright/studio-candidate-20260928');
mkdirSync(output, { recursive: true });
const pdfPath = 'downloads/studio/natal-sky-print-pack-sample.pdf';
const imagePath = 'img/shop/v917/natal-plate.png';
const expectedPdf = '7810089f1a0f9ebab104d9ce5da3933aa5c1ea7bb38fa8277a0e387f4ef2c657';
const expectedImage = 'ce608fbce5e9ebb3ab24ce18a3d8e42b42a6c51ee6218faddc2c5ecf6382a649';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(readFileSync(resolve(dist, pdfPath))), expectedPdf);
assert.equal(hash(readFileSync(resolve(dist, imagePath))), expectedImage);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
const server = createServer((request, response) => {
  try {
    let path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(dist, '.' + path);
    if (!file.startsWith(dist + sep)) { response.writeHead(403).end(); return; }
    const bytes = readFileSync(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const evidence = { at: new Date().toISOString(), base, expectedPdf, expectedImage, viewports: [], errors: [], failedRequests: [] };
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => evidence.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) evidence.failedRequests.push({url:response.url(),status:response.status()}); });
  for (const [width, height] of [[320, 568], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + '/shop.html');
    await page.locator('.studio-cover img').waitFor();
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode())); });
    const copy = await page.locator('main').innerText();
    assert.match(copy, /seven files: two home-print PDFs and five image layouts/);
    assert.match(copy, /Placidus houses/);
    assert.match(copy, /printing by a third-party service is not included/);
    assert.match(copy, /Checkout closed/);
    assert.equal(await page.locator('[data-product-sku]').count(), 1);
    assert.equal(await page.locator('a[href*="gumroad"]').count(), 0);
    assert.equal(await page.getByRole('link', { name: /Open the print sample/ }).getAttribute('href'), pdfPath);
    const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      images: [...document.querySelectorAll('main img')].map(image => ({source:new URL(image.src).pathname, width:image.naturalWidth, height:image.naturalHeight})) }));
    assert(geometry.scrollWidth <= width + 1);
    assert.equal(geometry.images.length, 2);
    for (const image of geometry.images) { assert.equal(image.source, '/' + imagePath); assert.equal(image.width,2160); assert.equal(image.height,2160); }
    evidence.viewports.push({ width, height, ...geometry });
    await page.screenshot({ path: resolve(output, `studio-${width}.png`), fullPage:true });
  }
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.reload();
  await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode())));
  const fetchHashes = async () => page.evaluate(async paths => {
    const results = [];
    for (const path of paths) {
      const response = await fetch(path);
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256',bytes);
      results.push({status:response.status,sha256:[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')});
    }
    return results;
  }, [pdfPath,imagePath]);
  const online = await fetchHashes();
  assert.deepEqual(online.map(x=>x.sha256),[expectedPdf,expectedImage]);
  await page.waitForFunction(() => caches.keys().then(keys=>keys.includes('ap-v917')));
  await page.waitForFunction(async paths => { const cache=await caches.open('ap-v917'); return (await Promise.all(paths.map(path=>cache.match(new URL(path,location.href).href)))).every(Boolean); }, [pdfPath,imagePath]);
  await context.setOffline(true);
  await page.reload();
  await page.locator('.studio-availability').waitFor();
  const offline = await fetchHashes();
  assert.deepEqual(offline.map(x=>x.sha256),[expectedPdf,expectedImage]);
  evidence.offline = { cache:'ap-v917', online, offline };
  assert.deepEqual(evidence.errors,[]);
  assert.deepEqual(evidence.failedRequests,[]);
  await context.close();
  evidence.passed = true;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  evidence.serverClosed = !server.listening;
  writeFileSync(resolve(output,'verification.json'),JSON.stringify(evidence,null,2)+'\n');
}
console.log('PASS Studio at 320/390: exact accepted sample, closed checkout, copy, geometry and offline bytes; browser/server closed');
