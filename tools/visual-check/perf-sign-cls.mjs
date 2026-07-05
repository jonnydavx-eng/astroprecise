/**
 * perf-sign-cls.mjs — measure Cumulative Layout Shift on a sign page, isolating
 * the font-swap reflow of the sign-hero heading/keyword/dates block.
 * Slow-throttles the network so the display webfont arrives AFTER first paint
 * (worst case for font-swap CLS), then records total CLS + the shift sources.
 *
 * Usage: node perf-sign-cls.mjs <sign> <label>   e.g. node perf-sign-cls.mjs capricorn before
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8790';
const SIGN = process.argv[2] || 'capricorn';
const LABEL = process.argv[3] || 'run';
const OUT = join(__dirname, 'out', 'redesign');

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const client = await ctx.newCDPSession(page);
  await client.send('Network.enable');
  // Throttle fonts so they arrive late → provokes the swap reflow we want to kill.
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (900 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
    latency: 300,
  });

  await page.addInitScript(() => {
    window.__cls = 0;
    window.__shifts = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          window.__cls += e.value;
          const nodes = (e.sources || []).map((s) => {
            const n = s.node;
            if (!n) return '?';
            const cls = n.className && typeof n.className === 'string' ? '.' + n.className.split(' ')[0] : '';
            return (n.tagName ? n.tagName.toLowerCase() : '?') + cls;
          });
          window.__shifts.push({ value: +e.value.toFixed(5), nodes });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}
  });

  await page.goto(`${BASE}/${SIGN}.html?cls=${Date.now()}`, { waitUntil: 'load', timeout: 60000 });
  // Wait long enough for fonts to arrive + any swap reflow to occur.
  await page.waitForTimeout(6000);
  // Ensure fonts settled
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(1500);

  const res = await page.evaluate(() => ({ cls: +window.__cls.toFixed(5), shifts: window.__shifts }));
  await browser.close();

  const out = { sign: SIGN, label: LABEL, capturedAt: new Date().toISOString(), ...res };
  const path = join(OUT, `sign-cls-${SIGN}-${LABEL}.json`);
  await writeFile(path, JSON.stringify(out, null, 2));
  console.log(`\n[${SIGN} / ${LABEL}] CLS = ${res.cls}`);
  console.log('shift sources:', JSON.stringify(res.shifts.slice(0, 12), null, 0));
  console.log('wrote', path);
}

main();
