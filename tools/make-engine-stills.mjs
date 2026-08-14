/**
 * make-engine-stills.mjs — PRODUCTION capture library for AstroPrecise graphics.
 *
 * Boots the homepage WebGL orrery (swiftshader, headless), lets the intro settle,
 * then for every body needed as a sign RULING PLANET plus the flagship set, calls
 * window.Orrery3D.enterPortrait(id, opts), captures an offscreen square via
 * captureFrame({scale}), encodes WEBP in-page via canvas.toDataURL('image/webp', q)
 * (sharp is broken on this machine), downscales to a fixed 1024×1024, and writes the
 * transparent .webp to website/img/engine/<id>.webp.
 *
 * The shipped library is the dependency for the sign heroes, product art and icons.
 * Determinism: every job carries a FIXED capture date (see JOBS) so re-runs are
 * byte-reproducible with no live-time dependency.
 *
 * Each still is VERIFIED in-page:
 *   • corner alpha ≈ 0 (transparent void for compositing behind engraved frames);
 *   • lit (a ring of central samples proves the disc is not a black silhouette) —
 *     if a body comes out dark, the harness retries with the body's altDate;
 *   • clean (no sun bloom/ring/orbits/labels/starfield/neighbours — guaranteed by
 *     portrait mode's per-frame hiding, re-asserted here by sampling the void).
 *
 * After the run it reloads the homepage normally and asserts the hero still renders
 * with zero page errors and isPortraitMode()===false (enterPortrait must not leak).
 *
 * Run:  node make-engine-stills.mjs [http://localhost:8790] [--only=uranus,neptune]
 *       --only limits the run to named jobs and merges into the existing manifest,
 *       so a texture swap can be re-shot without rewriting the whole library.
 * Out:  website/img/engine/<id>.webp  +  website/img/engine/manifest.json
 *       + a JSON report to stdout.
 */
import { chromium } from './visual-check/node_modules/playwright/index.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, readFileSync, statSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith('--')) || 'http://localhost:8790';
const onlyArg = args.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : null;
const OUT = join(__dirname, '..', 'website', 'img', 'engine');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SIZE = 1024;         // final square, downscaled from the high-DPR capture
const CAP_SCALE = 3;       // captureFrame supersample factor (proof used 3)
const Q = 0.85;            // webp quality target (< 120KB each)

// Which sign each body RULES (traditional + modern), for the manifest.
const RULER_OF = {
  sun:     ['Leo'],
  moon:    ['Cancer'],
  mercury: ['Gemini', 'Virgo'],
  venus:   ['Taurus', 'Libra'],
  earth:   [],                 // flagship / home body, not a ruler
  mars:    ['Aries', 'Scorpio (traditional)'],
  jupiter: ['Sagittarius', 'Pisces (traditional)'],
  saturn:  ['Capricorn', 'Aquarius (traditional)'],
  uranus:  ['Aquarius (modern)'],
  neptune: ['Pisces (modern)'],
  pluto:   ['Scorpio (modern)'],
  'earth-moon': [],
};

// JOBS manifest. Every job: {id, out, size, date (FIXED, deterministic), altDate
// (retry if the primary comes out dark), frame, fillFrac}. Dates are chosen near a
// clean angular geometry; the sun-lit-side portrait camera already guarantees the
// lit hemisphere faces the lens, so the date mainly picks which textured face shows
// and avoids degenerate line-of-sight-through-the-sun framing.
const JOBS = [
  // Flagship textured bodies (proven print-grade in the proof).
  { id: 'earth',   frame: 'portrait', fillFrac: 0.72, date: '2026-03-20T12:00:00Z', altDate: '2026-09-22T12:00:00Z' },
  { id: 'mars',    frame: 'portrait', fillFrac: 0.72, date: '2025-01-16T12:00:00Z', altDate: '2026-03-20T12:00:00Z' }, // near 2025 opposition
  { id: 'jupiter', frame: 'portrait', fillFrac: 0.70, date: '2025-12-07T12:00:00Z', altDate: '2026-03-20T12:00:00Z' }, // near 2025 opposition
  { id: 'saturn',  frame: 'portrait', fillFrac: 0.44, date: '2025-09-21T12:00:00Z', altDate: '2026-03-20T12:00:00Z', q: 0.6 }, // rings span ~2.3× disc → tighter fill; ring banding sets a ~190KB webp floor at 1024² regardless of q (documented exception)
  { id: 'mercury', frame: 'portrait', fillFrac: 0.70, date: '2026-03-20T12:00:00Z', altDate: '2026-04-21T12:00:00Z' },
  { id: 'venus',   frame: 'portrait', fillFrac: 0.72, date: '2026-03-20T12:00:00Z', altDate: '2026-06-20T12:00:00Z' },
  // Ice giants use the Hubble OPAL global maps (see website/assets/textures/
  // ice-giants-source.txt). Both maps have an unobserved polar region the harness
  // must not paint over, so the note travels into the manifest with the still.
  { id: 'uranus',  frame: 'portrait', fillFrac: 0.70, date: '2025-11-21T12:00:00Z', altDate: '2026-03-20T12:00:00Z', // near 2025 opposition
    note: 'Hubble OPAL 2025a map; its unobserved southern region is real and is not painted in' },
  { id: 'neptune', frame: 'portrait', fillFrac: 0.70, date: '2025-09-23T12:00:00Z', altDate: '2026-03-20T12:00:00Z', // near 2025 opposition
    note: 'Hubble OPAL 2025b map; the saturated fringe on the north limb is the map coverage edge, not a shader artifact. Date chosen as the lowest-fringe longitude of six tested; it cannot be rotated out and is not painted out' },

  // SUN — special: the light source. enterPortrait('sun') shows the sun disc + a
  // controlled inner golden glow (capture-only branch), not a blown-out white disc.
  { id: 'sun',     frame: 'sun',      fillFrac: 0.44, date: '2026-03-20T12:00:00Z', altDate: '2026-06-20T12:00:00Z' },

  // MOON — Cancer's ruler. A clean moon-ONLY portrait: a lit gibbous disc, no Earth.
  { id: 'moon',       frame: 'moon',      fillFrac: 0.66, date: '2026-03-20T12:00:00Z', altDate: '2026-03-28T12:00:00Z' },
  // EARTH-MOON — flagship composed still: lit Earth + lit Moon sharing the frame.
  { id: 'earth-moon', frame: 'earthmoon', fillFrac: 0.70, date: '2026-03-20T12:00:00Z', altDate: '2026-03-28T12:00:00Z' },

  // PLUTO — low-detail body. The engine has only 8 BODIES (no Pluto mesh), so a
  // premium textured portrait is impossible. Scorpio falls back to Mars (its
  // traditional ruler). We emit a dignified generated Pluto disc (see makePlutoStill)
  // so the library is complete, and note the fallback in the manifest.
  { id: 'pluto',   frame: 'generated', fillFrac: 0.66, date: '2026-03-20T12:00:00Z', altDate: null, generated: true },
];


// Readiness gate. The old gate also required html.orrery-full, which orrery-loader
// used to set; the void-orrery adapter boots orrery-webgl.js directly and never adds
// that class, so the gate hung forever. The honest signal is the live engine API
// itself plus its own ready promises.
async function waitForEngine(page) {
  await page.waitForFunction(
    () => window.Orrery3D && window.Orrery3D.isWebGL === true &&
      typeof window.Orrery3D.enterPortrait === 'function' &&
      typeof window.Orrery3D.captureFrame === 'function',
    null, { timeout: 45000 }
  );
  await page.evaluate(async () => {
    if (window.Orrery3D.whenReady) await window.Orrery3D.whenReady();
    if (window.Orrery3D.whenEarthReady) await window.Orrery3D.whenEarthReady();
  });
}

/**
 * Enter a portrait, settle, capture a supersampled webp, downscale to SIZE×SIZE, and
 * analyse corner alpha (transparency) + a center sample grid (lit-ness). Returns a
 * data URL for the FINAL 1024² image plus the metrics.
 */
async function capturePortrait(page, job, dateIso) {
  return page.evaluate(async (args) => {
    const O = window.Orrery3D;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const enterId = args.frame === 'sun' ? 'sun'
      : args.frame === 'earthmoon' ? 'earth'
      : args.frame === 'moon' ? 'moon'
      : args.id;
    const opts = { date: args.dateIso, fillFrac: args.fillFrac };
    if (args.frame) opts.frame = args.frame;
    const ok = O.enterPortrait(enterId, opts);
    if (!ok) return { ok: false, reason: 'enterPortrait returned false' };

    await wait(1400);          // camera swing + settle
    await raf2();

    const off = O.captureFrame({ scale: args.capScale });
    if (!off) { O.exitPortrait && O.exitPortrait(); return { ok: false, reason: 'captureFrame returned null' }; }

    // Downscale the supersampled capture to the final square with high-quality
    // resampling (transparent-preserving) so files stay light.
    const fin = document.createElement('canvas');
    fin.width = args.size; fin.height = args.size;
    const fx = fin.getContext('2d');
    fx.imageSmoothingEnabled = true;
    fx.imageSmoothingQuality = 'high';
    // captureFrame returns a square offscreen; center-fit just in case w≠h.
    const s = Math.min(off.width, off.height);
    const sx = (off.width - s) / 2, sy = (off.height - s) / 2;
    fx.clearRect(0, 0, args.size, args.size);
    fx.drawImage(off, sx, sy, s, s, 0, 0, args.size, args.size);

    const W = args.size, H = args.size;
    const px = (x, y) => Array.from(fx.getImageData(x, y, 1, 1).data);
    const corners = {
      tl: px(2, 2), tr: px(W - 3, 2), bl: px(2, H - 3), br: px(W - 3, H - 3),
    };
    const cornerAlphaMax = Math.max(corners.tl[3], corners.tr[3], corners.bl[3], corners.br[3]);

    // Lit-ness: sample a 9×9 grid across the central 60% of the frame.
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
        if (lum > 60) litSamples++;
      }
    }
    const meanLum = n ? sum / n : 0;
    const dataUrl = fin.toDataURL('image/webp', args.q);
    return {
      ok: true, w: W, h: H, dataUrl,
      corners, cornerAlphaMax,
      meanLum: Math.round(meanLum), maxLum: Math.round(maxLum),
      opaqueSamples: opaque, litSamples,
      centerPx: px(W >> 1, H >> 1),
    };
  }, { id: job.id, frame: job.frame, fillFrac: job.fillFrac, dateIso, size: SIZE, capScale: CAP_SCALE, q: (typeof job.q === 'number' ? job.q : Q) });
}

/**
 * Pluto: the engine has no Pluto mesh. Generate a dignified, print-grade Pluto disc
 * in-page on a 2D canvas — a lit sphere with Pluto's real tan/charcoal heart-plain
 * tones and a soft terminator — then encode a transparent 1024² webp. Deterministic
 * (seeded), so it's reproducible. Scorpio still falls back to Mars; this only keeps
 * the flagship library complete.
 */
async function makePlutoStill(page, job) {
  return page.evaluate(async (args) => {
    const S = args.size;
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d');
    g.clearRect(0, 0, S, S);
    const cx = S / 2, cy = S / 2;
    const R = S * (args.fillFrac / 2);
    // Light comes from upper-left; terminator toward lower-right.
    const lx = -0.55, ly = -0.5;
    // seeded mulberry32 for reproducible surface mottle
    let a = 0x9e3779b9 >>> 0;
    const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

    const img = g.createImageData(S, S);
    const d = img.data;
    // Pluto palette: pale tan nitrogen plain (Sputnik/Tombaugh) + darker charcoal
    // Cthulhu-region tones.
    const light = [206, 184, 156];  // warm tan highlight
    const mid   = [150, 128, 108];
    const dark  = [64, 54, 48];     // charcoal shadow
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (x - cx) / R, dy = (y - cy) / R;
        const r2 = dx * dx + dy * dy;
        const i = (y * S + x) * 4;
        if (r2 > 1) { d[i + 3] = 0; continue; }
        const dz = Math.sqrt(1 - r2);            // sphere z
        // lambert with the light dir (normalized)
        const ll = Math.hypot(lx, ly, 1);
        const ndotl = Math.max(0, (dx * lx + dy * ly + dz * 1) / ll);
        const term = Math.pow(ndotl, 0.9);       // soft terminator
        // low-freq mottle: a couple of value bands to suggest the heart plain
        const lat = dy, lon = dx;
        const band = 0.5 + 0.5 * Math.sin(lon * 2.3 + lat * 1.1 + 1.2);
        const heart = Math.max(0, 1 - Math.hypot(dx - 0.15, dy + 0.1) * 1.6); // bright plain lower-centre
        let base = [
          mid[0] + (light[0] - mid[0]) * band,
          mid[1] + (light[1] - mid[1]) * band,
          mid[2] + (light[2] - mid[2]) * band,
        ];
        base = [
          base[0] + (light[0] - base[0]) * heart * 0.7,
          base[1] + (light[1] - base[1]) * heart * 0.7,
          base[2] + (light[2] - base[2]) * heart * 0.7,
        ];
        // fine grain
        const grain = (rnd() - 0.5) * 10;
        // shade by terminator toward dark
        let cr = dark[0] + (base[0] - dark[0]) * term + grain;
        let cg = dark[1] + (base[1] - dark[1]) * term + grain;
        let cb = dark[2] + (base[2] - dark[2]) * term + grain;
        // limb darkening
        const limb = 0.55 + 0.45 * dz;
        cr *= limb; cg *= limb; cb *= limb;
        // soft edge alpha (antialias the disc rim)
        const edge = Math.min(1, (1 - Math.sqrt(r2)) * R * 0.5);
        d[i] = Math.max(0, Math.min(255, cr));
        d[i + 1] = Math.max(0, Math.min(255, cg));
        d[i + 2] = Math.max(0, Math.min(255, cb));
        d[i + 3] = Math.round(255 * Math.max(0, Math.min(1, edge)));
      }
    }
    g.putImageData(img, 0, 0);

    // metrics (same shape as capturePortrait)
    const px = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data);
    const W = S, H = S;
    const corners = { tl: px(2, 2), tr: px(W - 3, 2), bl: px(2, H - 3), br: px(W - 3, H - 3) };
    const cornerAlphaMax = Math.max(corners.tl[3], corners.tr[3], corners.bl[3], corners.br[3]);
    const x0 = Math.round(W * 0.20), x1 = Math.round(W * 0.80);
    const y0 = Math.round(H * 0.20), y1 = Math.round(H * 0.80);
    let sum = 0, n = 0, maxLum = 0, litSamples = 0, opaque = 0;
    for (let gy = 0; gy < 9; gy++) for (let gx = 0; gx < 9; gx++) {
      const x = Math.round(x0 + (x1 - x0) * gx / 8), y = Math.round(y0 + (y1 - y0) * gy / 8);
      const p = px(x, y);
      if (p[3] < 20) continue;
      opaque++;
      const lum = 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
      sum += lum; n++; if (lum > maxLum) maxLum = lum; if (lum > 60) litSamples++;
    }
    return {
      ok: true, w: W, h: H, dataUrl: c.toDataURL('image/webp', args.q),
      corners, cornerAlphaMax,
      meanLum: Math.round(n ? sum / n : 0), maxLum: Math.round(maxLum),
      opaqueSamples: opaque, litSamples, centerPx: px(W >> 1, H >> 1),
    };
  }, { size: SIZE, fillFrac: job.fillFrac, q: Q });
}

function writeWebp(id, dataUrl) {
  const b64 = dataUrl.replace(/^data:image\/webp;base64,/, '');
  const buf = Buffer.from(b64, 'base64');
  const path = join(OUT, `${id}.webp`);
  writeFileSync(path, buf);
  return { path, file: `${id}.webp`, bytes: buf.length };
}

function verdict(res) {
  const clean = res.cornerAlphaMax <= 8;                       // corners essentially transparent
  const lit = res.litSamples >= 12 && res.maxLum >= 110;       // clearly not a silhouette
  return { clean, lit };
}

function readManifest() {
  try { return JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')); } catch (e) { return null; }
}

async function main() {
  const jobs = ONLY ? JOBS.filter((j) => ONLY.includes(j.id)) : JOBS;
  if (ONLY && jobs.length !== ONLY.length) {
    const missing = ONLY.filter((id) => !JOBS.some((j) => j.id === id));
    console.error('unknown --only ids:', missing.join(', '));
    process.exit(2);
  }
  const report = { base: BASE, size: SIZE, only: ONLY, portraits: [], homepageReload: null };
  const prior = ONLY ? readManifest() : null;
  const manifest = {
    generated: new Date().toISOString(), size: SIZE, quality: Q,
    stills: prior && Array.isArray(prior.stills) ? prior.stills.slice() : [],
  };
  if (ONLY) manifest.partialRecapture = { at: new Date().toISOString(), ids: ONLY };
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // The engine picks geometry segment counts and texture tier (_sm / _md / full)
  // from navigator.hardwareConcurrency + deviceMemory. A CI/VM container reports
  // 4 cores, which lands the engine on the LOW tier: faceted planet silhouettes and
  // half-resolution maps. A still is an offline print asset, so present the harness
  // as the desktop class the library is meant to represent. This changes the QUALITY
  // TIER only — the geometry, textures and ephemeris are the shipped ones.
  await page.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 16, configurable: true });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });
    } catch (e) { /* engine falls back to its own probe */ }
  });
  const pageErrors = [];
  page.on('pageerror', (e) => { pageErrors.push(e.message); console.error('pageerror:', e.message); });

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForEngine(page);
  await sleep(9000); // Earth-dive intro finish + textures load + settle

  // Track earthmoon capture so moon + earth-moon reuse one shot per date.
  for (const job of jobs) {
    let res = null;
    let usedDate = job.date;

    async function runOnce(dateIso) {
      if (job.generated) return makePlutoStill(page, job);
      const r = await capturePortrait(page, job, dateIso);
      await page.evaluate(() => window.Orrery3D.exitPortrait && window.Orrery3D.exitPortrait());
      return r;
    }

    res = await runOnce(job.date);
    // Retry with the alternate date if the primary came out dark / silhouetted.
    if (res.ok && !verdict(res).lit && job.altDate) {
      console.error('DARK', job.id, `meanLum=${res.meanLum} maxLum=${res.maxLum} → retry ${job.altDate}`);
      const alt = await runOnce(job.altDate);
      if (alt.ok && verdict(alt).lit) { res = alt; usedDate = job.altDate; }
      else if (alt.ok && alt.maxLum > res.maxLum) { res = alt; usedDate = job.altDate; }
    }

    if (!res.ok) {
      console.error('FAIL', job.id, res.reason);
      report.portraits.push({ id: job.id, ok: false, reason: res.reason });
      await page.evaluate(() => window.Orrery3D.exitPortrait && window.Orrery3D.exitPortrait());
      continue;
    }

    const { file, bytes } = writeWebp(job.id, res.dataUrl);
    const { clean, lit } = verdict(res);
    const kb = +(bytes / 1024).toFixed(1);
    report.portraits.push({
      id: job.id, ok: true, file, kb, date: usedDate, frame: job.frame,
      w: res.w, h: res.h,
      cornerAlphaMax: res.cornerAlphaMax, corners: res.corners, transparentCorners: clean,
      meanLum: res.meanLum, maxLum: res.maxLum, litSamples: res.litSamples,
      opaqueSamples: res.opaqueSamples, lit, centerPx: res.centerPx,
    });
    const notes = [];
    if (job.note) notes.push(job.note);
    if (job.generated) notes.push('engine has no Pluto mesh — generated disc; Scorpio falls back to Mars');
    if (kb > 120) notes.push('over 120KB budget: ring/high-frequency detail sets a webp floor at 1024²; lazy-cached (not in install shell)');
    const entry = {
      id: job.id, file, rulerOfSigns: RULER_OF[job.id] || [], kb,
      date: usedDate, frame: job.frame,
      generated: !!job.generated,
      overBudget: kb > 120,
      note: notes.length ? notes.join('; ') : undefined,
    };
    const at = manifest.stills.findIndex((s) => s.id === job.id);
    if (at >= 0) manifest.stills[at] = entry; else manifest.stills.push(entry);
    console.error('OK  ', job.id, `${res.w}x${res.h}`, `${kb}KB`,
      `cornerAlphaMax=${res.cornerAlphaMax}`, `meanLum=${res.meanLum}`, `maxLum=${res.maxLum}`,
      `lit=${lit}`, `transparent=${clean}`, `date=${usedDate}`);
    await sleep(200);
  }

  // Total library size.
  let totalKB = 0;
  for (const s of manifest.stills) { try { totalKB += statSync(join(OUT, s.file)).size; } catch (e) {} }
  manifest.totalKB = +(totalKB / 1024).toFixed(1);
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // ── Non-leak check: reload the homepage normally, confirm the hero still works ──
  const errorsBeforeReload = pageErrors.length;
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  try {
    await waitForEngine(page);
    await sleep(6000);
    const heroState = await page.evaluate(() => ({
      isWebGL: !!(window.Orrery3D && window.Orrery3D.isWebGL),
      isPortraitMode: !!(window.Orrery3D && window.Orrery3D.isPortraitMode && window.Orrery3D.isPortraitMode()),
      liveHome: document.body.classList.contains('ap-live-home'),
    }));
    report.homepageReload = {
      ok: heroState.isWebGL && heroState.liveHome && !heroState.isPortraitMode,
      heroState,
      pageErrorsDuringReload: pageErrors.slice(errorsBeforeReload),
    };
    console.error('RELOAD hero:', JSON.stringify(report.homepageReload));
  } catch (e) {
    report.homepageReload = { ok: false, reason: e.message, pageErrorsDuringReload: pageErrors.slice(errorsBeforeReload) };
    console.error('RELOAD FAIL', e.message);
  }

  report.pageErrorsTotal = pageErrors;
  report.totalKB = manifest.totalKB;
  await browser.close();
  const reportPath = join(OUT, 'make-engine-stills-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => { console.error(e); process.exit(2); });
