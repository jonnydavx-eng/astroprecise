/**
 * Deep audit — Lighthouse + axe + perf on all major pages.
 * Outputs out/deep/report.json with /100 scores per aspect.
 */
import { spawn } from 'child_process';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = (process.argv[2] || 'http://localhost:8790').replace(/\/$/, '');
const OUT = join(__dirname, 'out', 'deep');
const LH = join(__dirname, 'node_modules', 'lighthouse', 'cli', 'index.js');

const PAGES = [
  { id: 'index', path: '/?lite=1' },
  { id: 'chart', path: '/chart.html' },
  { id: 'horoscope', path: '/horoscope.html' },
  { id: 'compatibility', path: '/compatibility.html' },
  { id: 'ephemeris', path: '/ephemeris.html' },
  { id: 'shop', path: '/shop.html' },
];

function runLighthouse(url, outPath) {
  return new Promise((resolve, reject) => {
    const args = [
      LH, url, '--output=json', `--output-path=${outPath}`,
      '--quiet', '--chrome-flags=--headless',
      '--only-categories=performance,accessibility,best-practices,seo',
    ];
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      if (code === 0) return resolve();
      // Windows EPERM on temp cleanup — JSON often still written
      readFile(outPath, 'utf8').then(() => resolve()).catch(() => reject(new Error(err || `exit ${code}`)));
    });
  });
}

function axeScore(violations) {
  let s = 100;
  for (const v of violations) {
    if (v.impact === 'critical') s -= 25;
    else if (v.impact === 'serious') s -= 15;
    else if (v.impact === 'moderate') s -= 8;
    else if (v.impact === 'minor') s -= 3;
  }
  return Math.max(0, s);
}

function perfScore(metrics, lhPerf) {
  if (lhPerf != null) return lhPerf;
  let s = 100;
  if (metrics.fcp > 1800) s -= Math.min(30, Math.round((metrics.fcp - 1800) / 100));
  if (metrics.lcp > 2500) s -= Math.min(35, Math.round((metrics.lcp - 2500) / 150));
  if (metrics.loadMs > 5000) s -= Math.min(20, Math.round((metrics.loadMs - 5000) / 500));
  return Math.max(0, s);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = {
    base: BASE,
    capturedAt: new Date().toISOString(),
    pages: [],
    summary: {},
    issues: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
  });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
    try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
  });

  for (const p of PAGES) {
    const url = `${BASE}${p.path}`;
    const entry = { id: p.id, path: p.path, url, scores: {} };
    const lhPath = join(OUT, `${p.id}.lighthouse.json`);

    try {
      await runLighthouse(url, lhPath);
      const lhr = JSON.parse(await readFile(lhPath, 'utf8'));
      for (const [cat, data] of Object.entries(lhr.categories || {})) {
        entry.scores[cat] = Math.round((data.score || 0) * 100);
      }
      entry.metrics = {
        fcp: lhr.audits?.['first-contentful-paint']?.numericValue,
        lcp: lhr.audits?.['largest-contentful-paint']?.numericValue,
        cls: lhr.audits?.['cumulative-layout-shift']?.numericValue,
        tbt: lhr.audits?.['total-blocking-time']?.numericValue,
        si: lhr.audits?.['speed-index']?.numericValue,
      };
      entry.lighthouse = {
        performance: entry.scores.performance,
        accessibility: entry.scores.accessibility,
        'best-practices': entry.scores['best-practices'],
        seo: entry.scores.seo,
      };
      if (entry.scores.performance < 50) report.issues.push(`${p.id}: lighthouse perf ${entry.scores.performance}`);
    } catch (err) {
      entry.lighthouseError = String(err);
      report.issues.push(`${p.id} lighthouse: ${err.message || err}`);
    }

    const page = await context.newPage();
    try {
      const t0 = Date.now();
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      const loadMs = Date.now() - t0;
      await page.waitForTimeout(p.id === 'index' || p.id === 'ephemeris' ? 3000 : 1500);
      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const paints = performance.getEntriesByType('paint');
        const fcp = paints.find((x) => x.name === 'first-contentful-paint');
        let lcp = null;
        try {
          const obs = performance.getEntriesByType('largest-contentful-paint');
          if (obs.length) lcp = obs[obs.length - 1].startTime;
        } catch (_) {}
        return {
          fcp: fcp ? Math.round(fcp.startTime) : null,
          lcp: lcp ? Math.round(lcp) : null,
          loadMs: nav ? Math.round(nav.loadEventEnd) : null,
        };
      });
      metrics.loadMs = metrics.loadMs || loadMs;

      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
        .analyze();
      entry.axe = {
        violations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
        passes: axe.passes.length,
      };
      entry.scores.axe = axeScore(axe.violations);
      entry.scores.perfPlaywright = perfScore({ ...metrics, loadMs: metrics.loadMs }, entry.scores.performance);

      const state = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelector('h1')?.textContent?.trim()?.slice(0, 60) || '',
        bodyClass: document.body.className,
        htmlClass: document.documentElement.className,
        liteHero: !!window.__apLiteHero,
        orreryReady: !!window.__orreryReady,
      }));
      entry.state = state;
      entry.metrics = { ...entry.metrics, ...metrics };
    } catch (err) {
      entry.pageError = String(err);
      report.issues.push(`${p.id} page: ${err.message || err}`);
    }
    await page.close();
    report.pages.push(entry);
  }

  await browser.close();

  const cats = ['performance', 'accessibility', 'best-practices', 'seo', 'axe'];
  for (const cat of cats) {
    const vals = report.pages.map((p) => p.scores[cat]).filter((v) => v != null);
    report.summary[cat] = vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : null;
  }
  const lhPages = report.pages.filter((p) => p.scores.performance != null);
  report.summary.overall = Math.round(
    (
      (report.summary.performance || 0) * 0.3 +
      (report.summary.accessibility || 0) * 0.2 +
      (report.summary['best-practices'] || 0) * 0.15 +
      (report.summary.seo || 0) * 0.15 +
      (report.summary.axe || 0) * 0.2
    )
  );
  report.summary.pageCount = report.pages.length;
  report.ok = report.issues.length === 0;

  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));
  console.log('\nPages:', report.pages.map((p) => `${p.id}: perf=${p.scores.performance ?? '?'} a11y=${p.scores.accessibility ?? '?'} axe=${p.scores.axe ?? '?'}`).join('\n'));
  process.exitCode = report.ok ? 0 : 1;
}

main().catch((e) => { console.error(e); process.exit(1); });