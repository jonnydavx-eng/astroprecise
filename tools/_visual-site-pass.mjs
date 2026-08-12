/**
 * Visual pass: screenshot launch + product pages at desktop and phone.
 * Uses Chrome via Playwright. Does not claim WebGL quality.
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './visual-check/node_modules/playwright/index.mjs';

const root = join(fileURLToPath(new URL('..', import.meta.url)), 'website');
const outDir = join(fileURLToPath(new URL('..', import.meta.url)), 'outreach-exports', 'site-pass-2026-08-12');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const pages = [
  'index.html?nosw=1',
  'chart.html?nosw=1',
  'horoscope.html?nosw=1',
  'eclipse.html?nosw=1',
  'shop.html?nosw=1',
  'sky-events.html?nosw=1',
  'deep-reading.html?nosw=1',
  'transits.html?nosw=1',
];

const views = [
  { name: 'desk', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
];

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const file = join(root, url.pathname === '/' ? 'index.html' : url.pathname);
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
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

for (const view of views) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  for (const route of pages) {
    const name = route.split('?')[0].replace('.html', '');
    await page.goto(`http://127.0.0.1:${port}/${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(name === 'index' || name === 'eclipse' ? 2500 : 900);
    const file = join(outDir, `${name}-${view.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log('WROTE', file);
  }
  await context.close();
}

await browser.close();
server.close();
console.log('PASS site visual pass →', outDir);
