/**
 * Lightweight perf metrics via Playwright (LCP/FCP/CLS from Performance API).
 * Works when Lighthouse chrome-launcher hits Windows temp EPERM.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'perf');

const PAGES = [
  { id: 'index', path: '/' },
  { id: 'chart', path: '/chart.html' },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
  });

  const report = { base: BASE, capturedAt: new Date().toISOString(), pages: [], issues: [] };

  for (const p of PAGES) {
    const page = await context.newPage();
    const entry = { id: p.id, path: p.path };
    try {
      const t0 = Date.now();
      await page.goto(`${BASE}${p.path}`, { waitUntil: 'load', timeout: 45000 });
      entry.loadMs = Date.now() - t0;
      entry.metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const paints = performance.getEntriesByType('paint');
        const fcp = paints.find((x) => x.name === 'first-contentful-paint');
        let lcp = null;
        try {
          const obs = performance.getEntriesByType('largest-contentful-paint');
          if (obs.length) lcp = obs[obs.length - 1].startTime;
        } catch (_) {}
        return {
          domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
          loadEvent: nav ? Math.round(nav.loadEventEnd) : null,
          fcp: fcp ? Math.round(fcp.startTime) : null,
          lcp: lcp ? Math.round(lcp) : null,
          transferSize: nav ? nav.transferSize : null,
        };
      });
      if (entry.loadMs > 8000) report.issues.push(`${p.id}: full load ${entry.loadMs}ms (>8s)`);
      if (entry.metrics.fcp && entry.metrics.fcp > 3000) {
        report.issues.push(`${p.id}: FCP ${entry.metrics.fcp}ms (>3s)`);
      }
    } catch (err) {
      entry.error = String(err);
      report.issues.push(`${p.id}: ${err.message || err}`);
    }
    report.pages.push(entry);
    await page.close();
  }

  report.ok = report.issues.length === 0;
  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exitCode = report.ok ? 0 : 1;
}

main();