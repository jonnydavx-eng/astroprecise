/**
 * Production-profile Lighthouse — real URLs and the visitor resource path.
 *
 * Measures the minified, compressed dist/ artifact through tools/serve-dist.mjs.
 * The browser host is headless, but measured CSS, icon, instrument and page
 * boot code must not branch on webdriver or HeadlessChrome. The release-honesty
 * gate locks that same-path contract for this 10-route batch.
 *
 * Run:  node lighthouse-production.mjs [baseUrl]
 *       npm run lighthouse:production
 *       npm run lighthouse:production:ci   # --ci uses the configured CI floors
 * Output: tools/visual-check/out/lighthouse/production/*.report.json
 */
import { spawn } from 'child_process';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_ARGS = process.argv.slice(2).filter((a) => a !== '--ci');
const BASE = (CLI_ARGS[0] || 'http://localhost:8790').replace(/\/$/, '');
const OUT = join(__dirname, 'out', 'lighthouse', 'production');
const LH = join(__dirname, 'node_modules', 'lighthouse', 'cli', 'index.js');

/** Production URLs — no lite/audit rendering shortcut (10-page CI batch). */
const URLS = [
  { id: 'chart', url: `${BASE}/chart.html` },
  { id: 'horoscope', url: `${BASE}/horoscope.html` },
  { id: 'aries', url: `${BASE}/aries.html` },
  { id: 'leo', url: `${BASE}/leo.html` },
  { id: 'compatibility', url: `${BASE}/compatibility.html` },
  { id: 'ephemeris', url: `${BASE}/ephemeris.html` },
  { id: 'shop', url: `${BASE}/shop.html` },
  { id: 'transits', url: `${BASE}/transits.html` },
  { id: 'lifepath', url: `${BASE}/lifepath.html` },
  { id: 'index', url: `${BASE}/?nosw=1` },
];

const CI_PERF_MIN = Number(process.env.LH_CI_PERF_MIN || 85);
const CI_A11Y_MIN = Number(process.env.LH_CI_A11Y_MIN || 0);
const CI_MODE = process.argv.includes('--ci') || process.env.LH_CI === '1';

function runLighthouse(url, outPath) {
  return new Promise((resolve, reject) => {
    const args = [
      LH,
      url,
      '--output=json',
      `--output-path=${outPath}`,
      '--quiet',
      '--chrome-flags=--headless --disable-blink-features=AutomationControlled',
      '--form-factor=mobile',
      '--screenEmulation.mobile',
      '--throttling-method=simulate',
      '--only-categories=performance,accessibility,best-practices,seo',
    ];
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      if (code === 0) return resolve();
      readFile(outPath, 'utf8').then(() => resolve()).catch(() => reject(new Error(err || `exit ${code}`)));
    });
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = {
    profile: 'production',
    base: BASE,
    capturedAt: new Date().toISOString(),
    note: 'Minified, compressed production artifact. Headless is the execution host only: measured CSS, icon, instrument and page boot code uses the visitor path. Home runs the real WebGL path; nosw only prevents test cache carry-over.',
    pages: [],
    issues: [],
  };

  for (const u of URLS) {
    const jsonPath = join(OUT, `${u.id}.report.json`);
    const entry = { id: u.id, url: u.url };
    try {
      let lhr = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        await runLighthouse(u.url, jsonPath);
        lhr = JSON.parse(await readFile(jsonPath, 'utf8'));
        const navErr = lhr.runtimeError?.code;
        if (!navErr || attempt === 1) break;
        if (navErr === 'CHROME_INTERSTITIAL_ERROR' || navErr === 'NO_FCP') {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        break;
      }
      if (lhr.runtimeError) {
        throw new Error(lhr.runtimeError.message || lhr.runtimeError.code);
      }
      entry.scores = {};
      for (const [cat, data] of Object.entries(lhr.categories || {})) {
        entry.scores[cat] = Math.round((data.score || 0) * 100);
      }
      entry.metrics = {
        lcp: lhr.audits?.['largest-contentful-paint']?.displayValue,
        cls: lhr.audits?.['cumulative-layout-shift']?.displayValue,
        fcp: lhr.audits?.['first-contentful-paint']?.displayValue,
        tbt: lhr.audits?.['total-blocking-time']?.displayValue,
        si: lhr.audits?.['speed-index']?.displayValue,
      };
      entry.headlessHost = /\bHeadlessChrome\b/i.test(
        lhr.environment?.hostUserAgent || lhr.userAgent || '',
      );
    } catch (err) {
      entry.error = String(err);
      report.issues.push(`${u.id}: ${err.message || err}`);
    }
    report.pages.push(entry);
  }

  const perfFails = report.pages.filter(
    (p) => !p.error && (p.scores?.performance ?? 0) < CI_PERF_MIN,
  );
  const a11yFails = CI_A11Y_MIN > 0
    ? report.pages.filter((p) => !p.error && (p.scores?.accessibility ?? 0) < CI_A11Y_MIN)
    : [];
  if (CI_MODE && perfFails.length) {
    for (const p of perfFails) {
      report.issues.push(`${p.id}: performance ${p.scores?.performance ?? 0} < ${CI_PERF_MIN}`);
    }
  }
  if (CI_MODE && a11yFails.length) {
    for (const p of a11yFails) {
      report.issues.push(`${p.id}: accessibility ${p.scores?.accessibility ?? 0} < ${CI_A11Y_MIN}`);
    }
  }

  report.ci = {
    mode: CI_MODE,
    perfMin: CI_PERF_MIN,
    a11yMin: CI_A11Y_MIN || null,
    perfFails: perfFails.map((p) => p.id),
    a11yFails: a11yFails.map((p) => p.id),
  };
  report.ok = report.issues.length === 0;

  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile(join(OUT, 'SUMMARY.md'), formatSummary(report));

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}

function formatSummary(report) {
  const lines = [
    '# Production Lighthouse Summary',
    '',
    `- **Profile:** ${report.profile}`,
    `- **Base:** ${report.base}`,
    `- **Captured:** ${report.capturedAt}`,
    `- **CI threshold:** performance ≥ ${CI_PERF_MIN}${CI_MODE ? ' (enforced)' : ' (informational)'}`,
    '',
    report.note ? `> ${report.note}` : '',
    '',
    '| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |',
    '|------|-------------|---------------|----------------|-----|-----|-----|',
  ].filter(Boolean);

  for (const p of report.pages) {
    if (p.error) {
      lines.push(`| ${p.id} | — | — | — | — | ERROR | ${p.error} |`);
      continue;
    }
    const s = p.scores || {};
    const fail = (s.performance ?? 0) < CI_PERF_MIN ? ' ⚠️' : '';
    lines.push(
      `| ${p.id}${fail} | ${s.performance ?? '—'} | ${s.accessibility ?? '—'} | ${s['best-practices'] ?? '—'} | ${s.seo ?? '—'} | ${p.metrics?.lcp ?? '—'} | ${p.metrics?.cls ?? '—'} |`,
    );
  }

  if (report.issues.length) {
    lines.push('', '## Issues', '');
    for (const issue of report.issues) lines.push(`- ${issue}`);
  } else if (report.ci.perfFails.length || report.ci.a11yFails.length) {
    lines.push('', '## Informational threshold misses', '');
    for (const id of report.ci.perfFails) {
      const page = report.pages.find((entry) => entry.id === id);
      lines.push(`- ${id}: performance ${page?.scores?.performance ?? 0} < ${report.ci.perfMin}`);
    }
    for (const id of report.ci.a11yFails) {
      const page = report.pages.find((entry) => entry.id === id);
      lines.push(`- ${id}: accessibility ${page?.scores?.accessibility ?? 0} < ${report.ci.a11yMin}`);
    }
    if (!report.ci.mode) lines.push('', 'CI enforcement was not enabled for this run.');
  } else {
    lines.push('', report.ci.mode
      ? 'All pages passed the enforced CI thresholds.'
      : 'All measured pages met the informational thresholds.');
  }

  return `${lines.join('\n')}\n`;
}

main();
