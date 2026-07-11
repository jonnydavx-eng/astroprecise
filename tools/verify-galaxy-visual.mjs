/**
 * verify-galaxy-visual.mjs — headless visual check for the Gaia barred-spiral
 * Milky Way at scale levels 5 (GALAXY) and 6 (COSMOS).
 *
 * Boots the WebGL hero (swiftshader), waits for orrery-full, then for each of
 * setScaleLevel(5) and setScaleLevel(6): settles >= 2400ms, saves a screenshot
 * to the scratchpad, and pixel-probes a centre grid for a large contiguous
 * region DARKER than the #0C1016 void background (the "black blob" failure).
 *
 * Run:  node tools/verify-galaxy-visual.mjs [http://localhost:8790]
 */
import { chromium } from './visual-check/node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';
import { PNG } from './visual-check/node_modules/pngjs/lib/png.js';

const BASE = process.argv[2] || 'http://localhost:8790';
const OUT_DIR = 'C:/Users/jonny/AppData/Local/Temp/claude/C--Users-jonny-OneDrive/7337457a-f86f-49c0-86f2-e075c0f782d5/scratchpad';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForEngine(page) {
  await page.waitForFunction(
    () => window.Orrery3D && window.Orrery3D.isWebGL === true &&
      typeof window.Orrery3D.setScaleLevel === 'function' &&
      document.documentElement.classList.contains('orrery-full'),
    null, { timeout: 45000 }
  );
}

// Probe a PNG buffer: sample a grid over the central 70% of the frame and flag
// contiguous cells that are DARKER than the void background (#0C1016 → luma ~15).
// The void itself is fine; the failure is a big region blacker than the bg.
function probeDarkBlob(buf, label) {
  const png = PNG.sync.read(buf);
  const { width: W, height: H, data } = png;
  const GRID = 40;
  const x0 = Math.floor(W * 0.15), x1 = Math.floor(W * 0.85);
  const y0 = Math.floor(H * 0.15), y1 = Math.floor(H * 0.85);
  const cw = (x1 - x0) / GRID, chh = (y1 - y0) / GRID;
  const dark = [];
  const darkGrid = new Uint8Array(GRID * GRID);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      // average a 3x3 sample within the cell
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const px = Math.floor(x0 + (gx + 0.25 + sx * 0.25) * cw);
          const py = Math.floor(y0 + (gy + 0.25 + sy * 0.25) * chh);
          const i = (py * W + px) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
      }
      r /= n; g /= n; b /= n;
      // void bg is rgb(12,16,22). A cell "darker than the void" (all channels
      // at/below bg minus tolerance) marks an occluder painting over the scene.
      if (r < 9 && g < 12 && b < 16) { darkGrid[gy * GRID + gx] = 1; dark.push([gx, gy]); }
    }
  }
  // largest 4-connected contiguous dark region
  const seen = new Uint8Array(GRID * GRID);
  let largest = 0;
  for (const [sx, sy] of dark) {
    const si = sy * GRID + sx;
    if (seen[si]) continue;
    let size = 0;
    const stack = [si];
    seen[si] = 1;
    while (stack.length) {
      const i = stack.pop(); size++;
      const cx = i % GRID, cy = (i / GRID) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
        const ni = ny * GRID + nx;
        if (darkGrid[ni] && !seen[ni]) { seen[ni] = 1; stack.push(ni); }
      }
    }
    if (size > largest) largest = size;
  }
  const pct = (largest / (GRID * GRID)) * 100;
  console.log(`[${label}] darker-than-void cells: ${dark.length}/${GRID * GRID}, largest contiguous: ${largest} (${pct.toFixed(1)}% of centre)`);
  return { darkCells: dark.length, largestRegion: largest, largestPct: pct };
}

async function main() {
  const report = { base: BASE, levels: {}, errors: [] };
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { report.errors.push('pageerror: ' + e.message); console.error('pageerror:', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { report.errors.push('console: ' + m.text()); console.error('console error:', m.text()); } });

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForEngine(page);
  await sleep(9000); // intro + textures + deferred galaxy build

  let failed = false;
  for (const lv of [5, 6]) {
    await page.evaluate((n) => window.Orrery3D.setScaleLevel(n), lv);
    await sleep(3200); // scale anim (1400ms) + settle >= 2000ms after arrival
    const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 820 } });
    const out = `${OUT_DIR}/galaxy-${lv}.png`;
    writeFileSync(out, shot);
    console.log(`saved ${out}`);
    const probe = probeDarkBlob(shot, `scale ${lv}`);
    report.levels[lv] = probe;
    // FAIL if a big contiguous darker-than-void region occludes the centre
    if (probe.largestPct > 3) {
      console.error(`FAIL: scale ${lv} has a large contiguous dark occluder (${probe.largestPct.toFixed(1)}% of centre grid)`);
      failed = true;
    }
  }

  await browser.close();
  if (report.errors.length) {
    console.error('ERRORS:', report.errors);
    failed = true;
  }
  console.log(failed ? 'GALAXY VISUAL CHECK: FAIL' : 'GALAXY VISUAL CHECK: PASS');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
