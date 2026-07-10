/**
 * Polish sweep 2026-07-10 — console errors + pageerrors + failed requests on
 * EVERY html page in website/. Read-only; writes JSON report to
 * out/polish-2026-07-10/console-sweep.json (gitignored).
 * Run: node tools/visual-check/_polish-console-sweep.mjs [base]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = (process.argv[2] || 'http://127.0.0.1:8790').replace(/\/$/, '');
const OUT = join(__dirname, 'out', 'polish-2026-07-10');
await mkdir(OUT, { recursive: true });

const SITE = join(__dirname, '..', '..', 'website');
const pages = (await readdir(SITE)).filter((f) => f.endsWith('.html')).sort();

const browser = await chromium.launch();
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
const report = [];

for (const file of pages) {
  const page = await ctx.newPage();
  const entry = { page: file, consoleErrors: [], consoleWarnings: [], pageErrors: [], failedRequests: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') entry.consoleErrors.push(msg.text().slice(0, 300));
    else if (msg.type() === 'warning') entry.consoleWarnings.push(msg.text().slice(0, 200));
  });
  page.on('pageerror', (e) => entry.pageErrors.push(String(e).slice(0, 300)));
  page.on('requestfailed', (r) => {
    const f = r.failure();
    entry.failedRequests.push(`${r.method()} ${r.url()} :: ${f ? f.errorText : '?'}`.slice(0, 250));
  });
  page.on('response', (r) => {
    if (r.status() >= 400) entry.failedRequests.push(`HTTP ${r.status()} ${r.url()}`.slice(0, 250));
  });
  try {
    await page.goto(`${BASE}/${file}`, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3500); // let deferred boots + engines run
  } catch (e) {
    entry.pageErrors.push('NAV-FAIL: ' + String(e).slice(0, 200));
  }
  await page.close();
  const bad = entry.consoleErrors.length + entry.pageErrors.length + entry.failedRequests.length;
  console.log(`${bad ? 'BAD ' : 'ok  '} ${file}  err=${entry.consoleErrors.length} pageerr=${entry.pageErrors.length} reqfail=${entry.failedRequests.length} warn=${entry.consoleWarnings.length}`);
  report.push(entry);
}

await browser.close();
await writeFile(join(OUT, 'console-sweep.json'), JSON.stringify(report, null, 2));
const dirty = report.filter((r) => r.consoleErrors.length || r.pageErrors.length || r.failedRequests.length);
console.log(`\n${dirty.length}/${report.length} pages with problems — details in out/polish-2026-07-10/console-sweep.json`);
for (const d of dirty) {
  console.log(`\n== ${d.page}`);
  for (const e of d.consoleErrors) console.log('  CONSOLE: ' + e);
  for (const e of d.pageErrors) console.log('  PAGEERR: ' + e);
  for (const e of d.failedRequests) console.log('  REQFAIL: ' + e);
}
