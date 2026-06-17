/**
 * Lighthouse performance + CLS/LCP snapshot (CLI wrapper — reliable on Windows).
 */
import { spawn } from 'child_process';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'lighthouse');
const LH = join(__dirname, 'node_modules', 'lighthouse', 'cli', 'index.js');

const URLS = [
  { id: 'index', url: `${BASE}/?lite=1` },
  { id: 'chart', url: `${BASE}/chart.html` },
];

function runLighthouse(url, outPath) {
  return new Promise((resolve, reject) => {
    const args = [
      LH,
      url,
      '--output=json',
      `--output-path=${outPath}`,
      '--quiet',
      '--chrome-flags=--headless',
      '--only-categories=performance,accessibility,best-practices,seo',
    ];
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err || `exit ${code}`))));
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { base: BASE, capturedAt: new Date().toISOString(), pages: [], issues: [] };

  for (const u of URLS) {
    const jsonPath = join(OUT, `${u.id}.report.json`);
    const entry = { id: u.id, url: u.url };
    try {
      await runLighthouse(u.url, jsonPath);
      const lhr = JSON.parse(await readFile(jsonPath, 'utf8'));
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

  report.ok = report.issues.length === 0;
  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}

main();