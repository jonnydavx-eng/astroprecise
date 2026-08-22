/**
 * Lighthouse performance + CLS/LCP snapshot.
 *
 * Reuse one explicit Chrome process. The CLI launcher creates and recursively
 * removes a fresh Windows temp profile for every URL; antivirus can retain a
 * handle briefly and turn a successful audit into a spurious EPERM failure.
 */
import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'lighthouse');
const WINDOWS_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const URLS = [
  { id: 'index', url: `${BASE}/?lite=1` },
  { id: 'chart', url: `${BASE}/chart.html` },
];

async function runLighthouse(url, chrome) {
  const result = await lighthouse(url, {
    port: chrome.port,
    logLevel: 'silent',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  });
  if (!result || !result.lhr) throw new Error('Lighthouse returned no report');
  return result.lhr;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { base: BASE, capturedAt: new Date().toISOString(), pages: [], issues: [] };
  const chrome = await launchChrome({
    chromePath: existsSync(WINDOWS_CHROME) ? WINDOWS_CHROME : undefined,
    chromeFlags: ['--headless=new', '--no-first-run', '--disable-dev-shm-usage'],
  });

  try {
    for (const u of URLS) {
      const jsonPath = join(OUT, `${u.id}.report.json`);
      const entry = { id: u.id, url: u.url };
      try {
        const lhr = await runLighthouse(u.url, chrome);
        await writeFile(jsonPath, JSON.stringify(lhr));
        entry.scores = {};
        for (const [cat, data] of Object.entries(lhr.categories || {})) {
          entry.scores[cat] = Math.round((data.score || 0) * 100);
        }
        entry.metrics = {
          lcp: lhr.audits?.['largest-contentful-paint']?.displayValue,
          cls: lhr.audits?.['cumulative-layout-shift']?.displayValue,
          fcp: lhr.audits?.['first-contentful-paint']?.displayValue,
          tbt: lhr.audits?.['total-blocking-time']?.displayValue,
        };
        if (entry.scores.performance < 50) {
          report.issues.push(`${u.id}: performance ${entry.scores.performance} (<50)`);
        }
        const clsVal = parseFloat(String(entry.metrics.cls).replace(/[^0-9.]/g, '')) || 0;
        if (clsVal > 0.1) report.issues.push(`${u.id}: CLS ${entry.metrics.cls}`);
      } catch (err) {
        entry.error = String(err);
        report.issues.push(`${u.id}: ${err.message || err}`);
      }
      report.pages.push(entry);
    }
  } finally {
    try { await chrome.kill(); } catch (err) {
      if (!/EPERM|permission denied/i.test(String(err))) throw err;
    }
  }

  report.ok = report.issues.length === 0;
  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}

main();
