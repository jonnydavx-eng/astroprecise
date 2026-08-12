/**
 * Snapshot each print-booklet page to PNG for visual check.
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './visual-check/node_modules/playwright/index.mjs';

const root = join(fileURLToPath(new URL('..', import.meta.url)), 'website');
const outDir = join(fileURLToPath(new URL('..', import.meta.url)), 'outreach-exports', 'eclipse-edition-preview');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
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
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await page.goto(`http://127.0.0.1:${port}/eclipse.html?nosw=1`, { waitUntil: 'domcontentloaded' });
const html = await page.evaluate(async () => {
  const templates = await fetch('js/reading-templates.json').then((r) => r.json());
  const geometryText = await fetch('img/eclipse-geometry.svg').then((r) => r.text());
  const { buildEclipseReading5 } = await import('./js/eclipse-reading.js');
  const {
    buildEclipsePlateModel,
    renderEclipsePrintAssets,
    buildEclipsePrintDocument,
  } = await import('./js/ap-eclipse-edition-v841.js');
  const eclipseLongitude = 140.133;
  const natal = {
    sun: eclipseLongitude, moon: 18, mercury: 132, venus: 95, mars: 48,
    jupiter: 210, saturn: 320, uranus: 28, neptune: 355, pluto: 250,
    asc: 12, mc: 280,
  };
  const reading = buildEclipseReading5(eclipseLongitude, natal, templates, { quietGateDeg: 5 });
  const model = buildEclipsePlateModel({ reading, natal, eclipseLongitude });
  const images = renderEclipsePrintAssets(model);
  images.geometry = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(geometryText)}`;
  return buildEclipsePrintDocument(model, images, { printOnLoad: false, demo: true });
});
const printPage = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await printPage.setContent(html, { waitUntil: 'load' });
await printPage.evaluate(() => Promise.all(
  [...document.images].map((img) => (img.complete
    ? null
    : new Promise((resolve) => { img.onload = img.onerror = resolve; }))),
));
mkdirSync(outDir, { recursive: true });
const count = await printPage.locator('article.page').count();
for (let i = 0; i < count; i += 1) {
  const path = join(outDir, `page-${String(i + 1).padStart(2, '0')}.png`);
  await printPage.locator('article.page').nth(i).screenshot({ path });
  console.log('WROTE', path);
}
await browser.close();
server.close();
console.log('pages', count);
