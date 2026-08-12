/**
 * Render a sample 12 Aug 2026 eclipse plate into the shop editorial PNG.
 * Uses Playwright + an ephemeral static server (does not bind :8790).
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './visual-check/node_modules/playwright/index.mjs';

const root = join(fileURLToPath(new URL('..', import.meta.url)), 'website');
const out = join(root, 'img', 'editorial', 'eclipse-edition-art-v841.png');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const file = join(root, url.pathname === '/' ? 'eclipse.html' : url.pathname);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const body = readFileSync(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/eclipse.html?nosw=1`, { waitUntil: 'domcontentloaded' });
const dataUrl = await page.evaluate(async () => {
  const templates = await fetch('js/reading-templates.json').then((r) => r.json());
  const { buildEclipseReading5 } = await import('./js/eclipse-reading.js');
  const { buildEclipsePlateModel, renderEclipseArtwork } = await import('./js/ap-eclipse-edition-v841.js');
  const eclipseLongitude = 140.133;
  const natal = {
    sun: eclipseLongitude, moon: 18, mercury: 132, venus: 95, mars: 48,
    jupiter: 210, saturn: 320, uranus: 28, neptune: 355, pluto: 250,
    asc: 12, mc: 280,
  };
  const reading = buildEclipseReading5(eclipseLongitude, natal, templates, { quietGateDeg: 5 });
  const model = buildEclipsePlateModel({ reading, natal, eclipseLongitude });
  const canvas = renderEclipseArtwork(model);
  const shop = document.createElement('canvas');
  shop.width = 1122;
  shop.height = 1402;
  shop.getContext('2d').drawImage(canvas, 0, 0, shop.width, shop.height);
  return shop.toDataURL('image/png');
});
await browser.close();
server.close();
if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
  throw new Error('Plate render did not return a PNG');
}
writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log('WROTE', out, 'bytes', readFileSync(out).length);
