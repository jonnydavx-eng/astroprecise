import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './node_modules/playwright/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', 'website');
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const f = path.join(ROOT, rel.replace(/^[\\/]+/, ''));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': mime + '; charset=utf-8' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(8792, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const ctx = await b.newContext({ javaScriptEnabled: false });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:8792/horoscope.html', { waitUntil: 'load' });
console.log('#hs-email count =', await p.locator('#hs-email').count());
console.log('#hs-form count  =', await p.locator('#hs-form').count());
console.log('submit count    =', await p.locator('#hs-form button[type=submit]').count());
console.log('visible         =', await p.locator('#hs-email').first().isVisible().catch(e => 'ERR ' + e.message));
try {
  await p.locator('#hs-email').first().fill('leaktest@example.invalid', { timeout: 4000, force: true });
  console.log('fill ok, readback =', JSON.stringify(await p.locator('#hs-email').first().inputValue()));
} catch (e) { console.log('fill threw:', e.message.split('\n')[0]); }
console.log('all named controls still in #hs-form:',
  await p.locator('#hs-form [name]').count());
await b.close(); server.close();
