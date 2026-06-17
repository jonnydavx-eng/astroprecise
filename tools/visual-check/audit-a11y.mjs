/**
 * Accessibility audit (axe-core) on major AstroPrecise pages.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'a11y');

const PAGES = [
  { id: 'index', path: '/' },
  { id: 'chart', path: '/chart.html' },
  { id: 'horoscope', path: '/horoscope.html' },
  { id: 'compatibility', path: '/compatibility.html' },
  { id: 'ephemeris', path: '/ephemeris.html' },
  { id: 'shop', path: '/shop.html' },
  { id: 'transits', path: '/transits.html' },
  { id: 'lifepath', path: '/lifepath.html' },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
    try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
  });

  const report = { base: BASE, capturedAt: new Date().toISOString(), pages: [], issues: [] };

  for (const p of PAGES) {
    const page = await context.newPage();
    const entry = { id: p.id, path: p.path, violations: [], incomplete: [] };
    try {
      await page.goto(`${BASE}${p.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
        .analyze();
      entry.violations = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
        help: v.help,
      }));
      entry.incomplete = results.incomplete.length;
      entry.passes = results.passes.length;
      for (const v of entry.violations) {
        if (v.impact === 'critical' || v.impact === 'serious') {
          report.issues.push(`${p.id}: ${v.id} (${v.impact}) — ${v.help}`);
        }
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