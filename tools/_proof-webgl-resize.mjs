/**
 * Proof: no 3D surface resolves to an empty frame after the stage is resized.
 *
 * The living sky renders through an EffectComposer. Some Chromium/ANGLE builds
 * resolve a multisampled HalfFloat composer target to an entirely blank frame
 * once the drawing buffer has been resized, which shows up as a black stage that
 * only recovers on a full remount. This proof drives the real pages in a real
 * browser: it boots each 3D surface, screenshots the canvas, then walks a set of
 * viewport sizes (desktop → laptop → tablet → phone → back) and screenshots
 * again after each one. A surface fails if a post-resize frame is essentially
 * uniform black while its own baseline frame was not.
 *
 * It reads the composited canvas via Playwright element screenshots rather than
 * drawImage, because the engine runs with preserveDrawingBuffer:false.
 *
 * Needs a local preview server (./launch.sh, port 8790) and Playwright browsers.
 * Not part of `npm run test:launch` — that gate is source-only and stays fast.
 *
 * Run:  node tools/_proof-webgl-resize.mjs [http://localhost:8790]
 */
import { chromium } from './visual-check/node_modules/playwright/index.mjs';
import { PNG } from './visual-check/node_modules/pngjs/lib/png.js';

const BASE = process.argv[2] || 'http://localhost:8790';

const PAGES = [
  { path: '/', canvas: 'void-orrery canvas', label: 'home (living sky)' },
  { path: '/chart.html', canvas: 'void-orrery canvas', label: 'chart (room sky)' },
  { path: '/tonight.html', canvas: 'void-orrery canvas', label: 'tonight (room sky)' },
  { path: '/compatibility.html', canvas: 'void-orrery canvas', label: 'couples (two natal clocks)' },
  { path: '/eclipse.html', canvas: '.ap-eclipse-live__canvas', label: 'eclipse (own renderer)' },
  // The opt-in HalfFloat + MSAA + bloom target. No shipping page asks for it, so
  // drive it here to keep the branch alive and to prove the post-resize frame
  // guard does not fire against a composer that is working.
  { path: '/', canvas: 'void-orrery canvas', label: 'home (cinematic composer opt-in)', cinematic: true },
];

const SIZES = [
  { w: 1440, h: 900, name: 'desktop' },
  { w: 1180, h: 820, name: 'laptop' },
  { w: 834, h: 1112, name: 'tablet portrait' },
  { w: 390, h: 844, name: 'phone' },
  { w: 1440, h: 900, name: 'desktop again' },
];

function stats(buf) {
  const png = PNG.sync.read(buf);
  const { width, height, data } = png;
  let peak = 0;
  let lit = 0;
  let n = 0;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 64));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const v = Math.max(data[i], data[i + 1], data[i + 2]);
      n += 1;
      if (v > peak) peak = v;
      if (v > 14) lit += 1;
    }
  }
  return { peak, litPct: n ? +(100 * lit / n).toFixed(2) : 0, w: width, h: height };
}

async function settle(page, ms) {
  await page.waitForTimeout(ms);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

async function shot(page, selector) {
  const el = await page.$(selector);
  if (!el) return null;
  const box = await el.boundingBox();
  if (!box || box.width < 8 || box.height < 8) return null;
  return stats(await el.screenshot({ type: 'png' }));
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const fails = [];
  const rows = [];

  for (const spec of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const pageErrors = [];
    const guardWarnings = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('console', (m) => {
      const t = m.text();
      if (t.includes('[orrery] composer') || t.includes('[orrery] safe composer')) guardWarnings.push(t);
    });
    // A CI/VM container reports 4 cores, which puts the engine on the LOW tier —
    // and the low tier never builds a composer at all, so an unspoofed run would
    // "pass" this proof without ever exercising the code it is here to test.
    // Present desktop-class hints so the composer is really in the pipeline.
    await page.addInitScript(() => {
      try {
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 16, configurable: true });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });
      } catch (e) { /* engine falls back to its own probe */ }
    });
    if (spec.cinematic) {
      await page.addInitScript(() => {
        const mark = () => {
          if (document.documentElement) document.documentElement.setAttribute('data-composer', 'cinematic');
        };
        mark();
        document.addEventListener('readystatechange', mark);
        document.addEventListener('DOMContentLoaded', mark);
      });
    }
    try {
      await page.goto(BASE + spec.path, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector(spec.canvas, { timeout: 45000 });
      await settle(page, 9000);

      // Only the void-orrery surfaces run a composer; eclipse has its own renderer.
      // The composer is attached after the intro settles, so wait for it rather
      // than sampling once — a run with no composer is not testing the composer.
      if (spec.canvas.startsWith('void-orrery')) {
        try {
          await page.waitForFunction(
            () => !!(window.Orrery3D && window.Orrery3D.hasComposer && window.Orrery3D.hasComposer()),
            null, { timeout: 30000 }
          );
          const cine = await page.evaluate(() => window.Orrery3D.usesCinematicComposer());
          if (!!spec.cinematic !== cine) {
            fails.push(`${spec.label}: expected cinematic=${!!spec.cinematic}, engine reports ${cine}`);
          }
        } catch (e) {
          fails.push(`${spec.label}: no composer in the pipeline — this proof would not test anything`);
        }
      }

      const base = await shot(page, spec.canvas);
      if (!base) { fails.push(`${spec.label}: no canvas to sample`); await ctx.close(); continue; }
      rows.push({ page: spec.label, size: 'baseline', ...base });
      if (base.peak <= 14) {
        fails.push(`${spec.label}: baseline frame is already blank (peak=${base.peak}) — cannot judge resizes`);
        await ctx.close();
        continue;
      }

      for (const size of SIZES) {
        await page.setViewportSize({ width: size.w, height: size.h });
        await settle(page, 1400);
        const after = await shot(page, spec.canvas);
        if (!after) { fails.push(`${spec.label} @ ${size.name}: canvas vanished`); continue; }
        rows.push({ page: spec.label, size: size.name, ...after });
        if (after.peak <= 14) {
          fails.push(`${spec.label} @ ${size.name} (${size.w}x${size.h}): empty frame after resize (peak=${after.peak}, baseline peak=${base.peak})`);
        }
      }
      if (pageErrors.length) fails.push(`${spec.label}: page errors — ${pageErrors.slice(0, 3).join(' | ')}`);
      if (guardWarnings.length) {
        fails.push(`${spec.label}: post-resize frame guard fired on a composer that renders — ${guardWarnings[0]}`);
      }
    } catch (err) {
      fails.push(`${spec.label}: ${err.message}`);
    }
    await ctx.close();
  }

  await browser.close();
  console.table(rows);
  if (fails.length) {
    fails.forEach((f) => console.error('FAIL', f));
    process.exit(1);
  }
  console.log('PASS no empty 3D frame after resize on any surface');
}

main().catch((e) => { console.error(e); process.exit(2); });
