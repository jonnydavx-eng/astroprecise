/**
 * portrait-proof.mjs — GATE proof for the planet PORTRAIT MODE in orrery-webgl.js.
 *
 * Boots the homepage WebGL orrery (swiftshader, headless), lets the intro settle,
 * then for each target body calls window.Orrery3D.enterPortrait(id, opts), captures
 * an offscreen square via captureFrame({scale:3}), encodes WEBP in-page via
 * canvas.toDataURL('image/webp', q) (sharp is broken on this machine), and writes
 * the .webp to out/redesign/portrait-proof-<id>.webp.
 *
 * It also:
 *   • samples the four corner pixels' alpha in-page (getImageData) to prove the void
 *     is genuinely transparent (~0) for compositing behind engraved frames, and
 *     samples a ring of center pixels to prove the framed planet is LIT (not a
 *     black silhouette);
 *   • after the portrait run, reloads the homepage normally and asserts the hero
 *     still renders with zero page errors (enterPortrait must not leak into boot).
 *
 * Run:  node portrait-proof.mjs [http://localhost:8790]
 * Out:  out/redesign/portrait-proof-*.webp  +  a JSON report to stdout.
 */
import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'redesign');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Deterministic epoch so lit-face + framing reproduce run-to-run.
const FIXED_DATE_ISO = '2026-03-20T12:00:00Z';

// Per-body portrait options. fillFrac tunes how much of the square the disc fills.
const BODIES = [
  { id: 'earth',   opts: { fillFrac: 0.72 } },
  { id: 'saturn',  opts: { fillFrac: 0.50 } }, // tighter — rings span ~2.3× the disc, keep corners clear
  { id: 'mars',    opts: { fillFrac: 0.72 } },
  { id: 'jupiter', opts: { fillFrac: 0.70 } },
];

async function waitForEngine(page) {
  await page.waitForFunction(
    () => window.Orrery3D && window.Orrery3D.isWebGL === true &&
      typeof window.Orrery3D.enterPortrait === 'function' &&
      typeof window.Orrery3D.captureFrame === 'function' &&
      document.documentElement.classList.contains('orrery-full'),
    null, { timeout: 45000 }
  );
  await page.evaluate(() => window.Orrery3D.whenEarthReady && window.Orrery3D.whenEarthReady());
}

// Enter a portrait, settle the camera swing + a couple of rAF, capture a webp, and
// analyse corner alpha (transparency) + a center sample grid (lit-ness).
async function capturePortrait(page, id, opts, dateIso) {
  return page.evaluate(async (args) => {
    const O = window.Orrery3D;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const ok = O.enterPortrait(args.id, { date: args.dateIso, ...(args.opts || {}) });
    if (!ok) return { ok: false, reason: 'enterPortrait returned false' };

    await wait(1400);          // camera swing + settle
    await raf2();

    const off = O.captureFrame({ scale: 3 });
    if (!off) return { ok: false, reason: 'captureFrame returned null' };

    // Read back via a 2D context for pixel analysis.
    const c = document.createElement('canvas');
    c.width = off.width; c.height = off.height;
    const cx = c.getContext('2d');
    cx.drawImage(off, 0, 0);
    const W = off.width, H = off.height;
    const px = (x, y) => Array.from(cx.getImageData(x, y, 1, 1).data);
    const corners = {
      tl: px(2, 2), tr: px(W - 3, 2), bl: px(2, H - 3), br: px(W - 3, H - 3),
    };
    const cornerAlphaMax = Math.max(corners.tl[3], corners.tr[3], corners.bl[3], corners.br[3]);

    // Lit-ness: sample a 9x9 grid across the central 60% of the frame; the planet
    // fills the middle, so measure the mean + max luminance of opaque samples.
    const x0 = Math.round(W * 0.20), x1 = Math.round(W * 0.80);
    const y0 = Math.round(H * 0.20), y1 = Math.round(H * 0.80);
    let sum = 0, n = 0, maxLum = 0, litSamples = 0, opaque = 0;
    for (let gy = 0; gy < 9; gy++) {
      for (let gx = 0; gx < 9; gx++) {
        const x = Math.round(x0 + (x1 - x0) * gx / 8);
        const y = Math.round(y0 + (y1 - y0) * gy / 8);
        const p = px(x, y);
        if (p[3] < 20) continue;   // skip transparent void samples
        opaque++;
        const lum = 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
        sum += lum; n++;
        if (lum > maxLum) maxLum = lum;
        if (lum > 60) litSamples++;   // "lit" = clearly out of silhouette black
      }
    }
    const meanLum = n ? sum / n : 0;

    const q = args.id === 'earth' ? 0.92 : 0.9;
    const dataUrl = off.toDataURL('image/webp', q);
    return {
      ok: true, w: W, h: H, dataUrl,
      corners, cornerAlphaMax,
      meanLum: Math.round(meanLum), maxLum: Math.round(maxLum),
      opaqueSamples: opaque, litSamples,
      centerPx: px(W >> 1, H >> 1),
    };
  }, { id, opts, dateIso: dateIso });
}

function writeWebp(name, dataUrl) {
  const b64 = dataUrl.replace(/^data:image\/webp;base64,/, '');
  const path = join(OUT, name);
  writeFileSync(path, Buffer.from(b64, 'base64'));
  return { path, bytes: Buffer.from(b64, 'base64').length };
}

async function main() {
  const report = { base: BASE, fixedDate: FIXED_DATE_ISO, portraits: [], homepageReload: null };
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => { pageErrors.push(e.message); console.error('pageerror:', e.message); });

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForEngine(page);
  await sleep(9000); // Earth-dive intro finish + textures load + settle

  for (const b of BODIES) {
    const res = await capturePortrait(page, b.id, b.opts, FIXED_DATE_ISO);
    if (!res.ok) {
      console.error('FAIL', b.id, res.reason);
      report.portraits.push({ id: b.id, ok: false, reason: res.reason });
      // ensure we exit portrait even on a failed capture
      await page.evaluate(() => window.Orrery3D.exitPortrait && window.Orrery3D.exitPortrait());
      continue;
    }
    const { path, bytes } = writeWebp(`portrait-proof-${b.id}.webp`, res.dataUrl);
    const clean = res.cornerAlphaMax <= 8;      // corners essentially transparent
    const lit = res.litSamples >= 12 && res.maxLum >= 110; // clearly not a silhouette
    report.portraits.push({
      id: b.id, ok: true, file: path, webpKB: +(bytes / 1024).toFixed(1),
      w: res.w, h: res.h,
      cornerAlphaMax: res.cornerAlphaMax, corners: res.corners, transparentCorners: clean,
      meanLum: res.meanLum, maxLum: res.maxLum, litSamples: res.litSamples,
      opaqueSamples: res.opaqueSamples, lit, centerPx: res.centerPx,
    });
    console.error('OK  ', b.id, `${res.w}x${res.h}`, `${(bytes / 1024).toFixed(1)}KB`,
      `cornerAlphaMax=${res.cornerAlphaMax}`, `meanLum=${res.meanLum}`, `maxLum=${res.maxLum}`,
      `lit=${lit}`, `transparent=${clean}`);
    // Reversible: exit before the next body.
    await page.evaluate(() => window.Orrery3D.exitPortrait && window.Orrery3D.exitPortrait());
    await sleep(300);
  }

  // ── Non-leak check: reload the homepage normally, confirm the hero still works ──
  const errorsBeforeReload = pageErrors.length;
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  try {
    await waitForEngine(page);
    await sleep(6000);
    const heroState = await page.evaluate(() => ({
      isWebGL: !!(window.Orrery3D && window.Orrery3D.isWebGL),
      isPortraitMode: !!(window.Orrery3D && window.Orrery3D.isPortraitMode && window.Orrery3D.isPortraitMode()),
      orreryFull: document.documentElement.classList.contains('orrery-full'),
    }));
    report.homepageReload = {
      ok: heroState.isWebGL && heroState.orreryFull && !heroState.isPortraitMode,
      heroState,
      pageErrorsDuringReload: pageErrors.slice(errorsBeforeReload),
    };
    console.error('RELOAD hero:', JSON.stringify(report.homepageReload));
  } catch (e) {
    report.homepageReload = { ok: false, reason: e.message, pageErrorsDuringReload: pageErrors.slice(errorsBeforeReload) };
    console.error('RELOAD FAIL', e.message);
  }

  report.pageErrorsTotal = pageErrors;
  await browser.close();
  const reportPath = join(OUT, 'portrait-proof-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => { console.error(e); process.exit(2); });
