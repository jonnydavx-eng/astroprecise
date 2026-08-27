/**
 * Accessibility audit (axe-core) on major AstroPrecise pages.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
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
  { id: 'deep-reading', path: '/deep-reading.html' },
  { id: 'tonight', path: '/tonight.html' },
  { id: 'eclipse', path: '/eclipse.html' },
  { id: 'sky-events', path: '/sky-events.html' },
  { id: 'transits', path: '/transits.html' },
  { id: 'lifepath', path: '/lifepath.html' },
  { id: 'links', path: '/links.html' },
  { id: 'profile', path: '/profile.html' },
  { id: 'saturn-return', path: '/saturn-return.html' },
  { id: 'accuracy', path: '/accuracy.html' },
  { id: 'angel-numbers', path: '/angel-numbers.html' },
  { id: 'aries', path: '/aries.html' },
  { id: 'charts', path: '/charts.html' },
  { id: 'catalogue', path: '/catalogue.html' },
  { id: 'contact', path: '/contact.html' },
  { id: 'cosmic-calendar', path: '/cosmic-calendar.html' },
  { id: 'guides', path: '/guides.html' },
  { id: 'journey', path: '/journey.html' },
  { id: 'moment', path: '/moment.html' },
  { id: 'moonphase', path: '/moonphase.html' },
  { id: 'name-numerology', path: '/name-numerology.html' },
  { id: 'numerology', path: '/numerology.html' },
  { id: 'privacy', path: '/privacy.html' },
  { id: 'refunds', path: '/refunds.html' },
  { id: 'retrograde', path: '/retrograde.html' },
  { id: 'sample-reading', path: '/sample-reading.html' },
  { id: 'solar-return', path: '/solar-return.html' },
  { id: 'terms', path: '/terms.html' },
  { id: 'rising-sign', path: '/what-is-my-rising-sign.html' },
  { id: 'why', path: '/why.html' },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const launch = { headless: true, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] };
  const windowsChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (existsSync(windowsChrome)) launch.executablePath = windowsChrome;
  const browser = await chromium.launch(launch);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
    try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
  });
  const version = process.env.AP_VERSION?.replace(/^ap-v/, '') || '902';

  const report = { base: BASE, capturedAt: new Date().toISOString(), pages: [], issues: [] };

  for (const p of PAGES) {
    const page = await context.newPage();
    const entry = { id: p.id, path: p.path, violations: [], incomplete: [] };
    try {
      const qs = `?nosw=1&v=${version}`;
      await page.goto(`${BASE}${p.path}${qs}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.evaluate(() => {
        document.querySelectorAll('.ap-reveal').forEach((el) => el.classList.add('ap-revealed'));
      });
      await page.waitForTimeout(1200);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
        .analyze();
      entry.violations = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
        help: v.help,
        targets: v.nodes.slice(0, 5).map((node) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
        })),
      }));
      entry.incomplete = results.incomplete.length;
      entry.passes = results.passes.length;
      for (const v of entry.violations) {
        report.issues.push(`${p.id}: ${v.id} (${v.impact || 'unrated'}) — ${v.help}`);
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
