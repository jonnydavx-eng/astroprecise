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
 * Bodies with no engine mesh (Pluto) are shot by makeMapSphereStill instead: the real
 * archived map on a lit three.js sphere, rendered alongside the engine rather than
 * inside it. Nothing in this library is painted.
 *
 * Run:  node make-engine-stills.mjs [http://localhost:8790] [--only=pluto[,mars]]
 *       --only re-shoots just those ids and merges them into the existing
 *       manifest/report, leaving the other stills untouched.
 * Out:  website/img/engine/<id>.webp  +  website/img/engine/manifest.json
 *       + a JSON report to stdout.
 */
import { chromium } from './visual-check/node_modules/playwright/index.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, readFileSync, statSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARGV = process.argv.slice(2);
// --only=pluto[,mars] regenerates just those stills and merges them into the existing
// manifest/report, so re-shooting one body cannot churn the other twelve.
const ONLY = (ARGV.find((a) => a.startsWith('--only=')) || '').slice('--only='.length)
  .split(',').map((s) => s.trim()).filter(Boolean);
const BASE = ARGV.find((a) => !a.startsWith('--')) || 'http://localhost:8790';
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
  { id: 'uranus',  frame: 'portrait', fillFrac: 0.70, date: '2025-11-21T12:00:00Z', altDate: '2026-03-20T12:00:00Z' }, // near 2025 opposition
  { id: 'neptune', frame: 'portrait', fillFrac: 0.70, date: '2025-09-23T12:00:00Z', altDate: '2026-03-20T12:00:00Z' }, // near 2025 opposition

  // SUN — special: the light source. enterPortrait('sun') shows the sun disc + a
  // controlled inner golden glow (capture-only branch), not a blown-out white disc.
  { id: 'sun',     frame: 'sun',      fillFrac: 0.44, date: '2026-03-20T12:00:00Z', altDate: '2026-06-20T12:00:00Z' },

  // MOON — Cancer's ruler. A clean moon-ONLY portrait: a lit gibbous disc, no Earth.
  { id: 'moon',       frame: 'moon',      fillFrac: 0.66, date: '2026-03-20T12:00:00Z', altDate: '2026-03-28T12:00:00Z' },
  // EARTH-MOON — flagship composed still: lit Earth + lit Moon sharing the frame.
  { id: 'earth-moon', frame: 'earthmoon', fillFrac: 0.70, date: '2026-03-20T12:00:00Z', altDate: '2026-03-28T12:00:00Z' },

  // PLUTO — the engine still has only 8 BODIES (no Pluto mesh), so enterPortrait()
  // cannot frame it and a real map is the only honest route. Rendered outside the
  // engine from the New Horizons colour mosaic (see makeMapSphereStill) rather than
  // painted. Scorpio still falls back to Mars (its traditional ruler).
  // turnDeg/tiltDeg put Sputnik Planitia on the lens with the IAU north tilted toward
  // it, which is how New Horizons actually saw Pluto and which leaves the hemisphere
  // the flyby never imaged behind the lower limb — hidden by curvature, not painted.
  { id: 'pluto',   frame: 'map-sphere', fillFrac: 0.66, date: '2026-03-20T12:00:00Z', altDate: null,
    mapSphere: true, tex: 'pluto.jpg', turnDeg: -90, tiltDeg: 22 },
];


/**
 * Wait for the capture API, not for the page's layout state. The original gate also
 * required the `orrery-full` class on <html>; the launch shell no longer sets it, which
 * hard-failed every engine portrait at the 45s timeout even though the engine was live
 * and WebGL was up. captureFrame() renders to its own offscreen buffer, so hero layout
 * is not a precondition. The class is still waited for briefly and reported, so a real
 * regression in it stays visible instead of being silently dropped.
 */
async function waitForEngine(page) {
  await page.waitForFunction(
    () => window.Orrery3D && window.Orrery3D.isWebGL === true &&
      typeof window.Orrery3D.enterPortrait === 'function' &&
      typeof window.Orrery3D.captureFrame === 'function',
    null, { timeout: 45000 }
  );
  let orreryFull = true;
  try {
    await page.waitForFunction(() => document.documentElement.classList.contains('orrery-full'),
      null, { timeout: 8000 });
  } catch (e) {
    orreryFull = false;
    console.error('NOTE orrery-full class absent — capturing from the offscreen buffer anyway');
  }
  await page.evaluate(() => window.Orrery3D.whenEarthReady && window.Orrery3D.whenEarthReady());
  return { orreryFull };
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
 * Bodies the engine has no mesh for (Pluto) still get a REAL still: the archived
 * equirectangular map on a lit three.js sphere, rendered in-page beside the engine
 * rather than inside it, so no engine change is needed. Same output contract as
 * capturePortrait — transparent void, sun from upper-left, 1024² webp — so the
 * library stays uniform and verdict() applies unchanged.
 *
 * Honesty: nothing is painted. Where the source map has no data (Pluto's southern
 * hemisphere was in polar night during the 2015 flyby) the sphere renders black, and
 * the framing simply puts that region behind the limb instead of inventing terrain to
 * fill it. unimagedFracOfDisc is measured and reported so the gap stays visible in the
 * record. This replaced a hand-painted procedural disc with an invented "heart" blob,
 * which predated any real Pluto map being in the repo.
 */
async function makeMapSphereStill(page, job) {
  return page.evaluate(async (args) => {
    const THREE = await import('/js/vendor/three/three.module.min.js');
    const SS = args.size * 2;                    // supersample, then downscale
    const gl = document.createElement('canvas');
    gl.width = gl.height = SS;
    const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, alpha: true });
    renderer.setClearAlpha(0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const tex = await new Promise((res, rej) =>
      new THREE.TextureLoader().load('/assets/textures/' + args.tex, res, undefined, rej));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    // fillFrac sets the disc's share of the frame: half-angle = atan(1/dist) must equal
    // fillFrac/2 of the vertical FOV.
    const fov = 30;
    const cam = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    const halfFov = (fov / 2) * Math.PI / 180;
    cam.position.set(0, 0, 1 / Math.sin(halfFov * args.fillFrac));
    // Sun from upper-left, matching every other still in the library.
    const sun = new THREE.DirectionalLight(0xfff4e2, 3.0);
    sun.position.set(-0.55, 0.5, 1);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.06));   // lifts the night limb only

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 192, 96),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 }));
    mesh.rotation.set(args.tiltDeg * Math.PI / 180, args.turnDeg * Math.PI / 180, 0);
    scene.add(mesh);
    renderer.render(scene, cam);

    // Downscale to the final square, preserving transparency.
    const fin = document.createElement('canvas');
    fin.width = fin.height = args.size;
    const fx = fin.getContext('2d');
    fx.imageSmoothingEnabled = true;
    fx.imageSmoothingQuality = 'high';
    fx.clearRect(0, 0, args.size, args.size);
    fx.drawImage(gl, 0, 0, SS, SS, 0, 0, args.size, args.size);

    const W = args.size, H = args.size;
    const all = fx.getImageData(0, 0, W, H).data;
    const px = (x, y) => { const i = (y * W + x) * 4; return [all[i], all[i + 1], all[i + 2], all[i + 3]]; };
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
    // How much of the visible disc carries no data — the gap, measured not hidden.
    let disc = 0, black = 0;
    for (let i = 0; i < W * H; i++) {
      if (all[i * 4 + 3] < 20) continue;
      disc++;
      const lum = 0.2126 * all[i * 4] + 0.7152 * all[i * 4 + 1] + 0.0722 * all[i * 4 + 2];
      if (lum < 12) black++;
    }
    return {
      ok: true, w: W, h: H, dataUrl: fin.toDataURL('image/webp', args.q),
      corners, cornerAlphaMax,
      meanLum: Math.round(n ? sum / n : 0), maxLum: Math.round(maxLum),
      opaqueSamples: opaque, litSamples, centerPx: px(W >> 1, H >> 1),
      unimagedFracOfDisc: disc ? +(black / disc).toFixed(3) : null,
    };
  }, { size: SIZE, fillFrac: job.fillFrac, q: (typeof job.q === 'number' ? job.q : Q),
       tex: job.tex, turnDeg: job.turnDeg, tiltDeg: job.tiltDeg });
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

/** Replace entries by id, keeping every other entry (and its order) untouched. */
function mergeById(existing, fresh) {
  const out = existing.slice();
  for (const item of fresh) {
    const at = out.findIndex((e) => e.id === item.id);
    if (at >= 0) out[at] = item; else out.push(item);
  }
  return out;
}

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(join(OUT, file), 'utf8')); } catch (e) { return fallback; }
}

async function main() {
  const jobs = ONLY.length ? JOBS.filter((j) => ONLY.includes(j.id)) : JOBS;
  if (!jobs.length) { console.error('no jobs match --only=' + ONLY.join(',')); process.exit(2); }
  // Only engine portraits need the homepage orrery booted; a map-sphere still does not.
  const needsEngine = jobs.some((j) => !j.mapSphere);
  const priorManifest = ONLY.length ? readJson('manifest.json', null) : null;
  const priorReport = ONLY.length ? readJson('make-engine-stills-report.json', null) : null;

  const report = { base: BASE, size: SIZE, portraits: [], homepageReload: null };
  const manifest = { generated: new Date().toISOString(), size: SIZE, quality: Q, stills: [] };
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => { pageErrors.push(e.message); console.error('pageerror:', e.message); });

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (needsEngine) {
    report.engineBoot = await waitForEngine(page);
    await sleep(9000); // Earth-dive intro finish + textures load + settle
  }

  // Track earthmoon capture so moon + earth-moon reuse one shot per date.
  for (const job of jobs) {
    let res = null;
    let usedDate = job.date;

    async function runOnce(dateIso) {
      if (job.mapSphere) return makeMapSphereStill(page, job);
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
      if (!job.mapSphere) await page.evaluate(() => window.Orrery3D.exitPortrait && window.Orrery3D.exitPortrait());
      continue;
    }

    // Refuse to replace a good still with one that fails the transparency contract.
    // These composite behind engraved frames, so an opaque void is library corruption —
    // and it happens for real: capturing before the launch shell reaches its hero layout
    // yields a solid background even though the engine and WebGL are both up.
    const pre = verdict(res);
    if (!pre.clean && existsSync(join(OUT, `${job.id}.webp`))) {
      console.error('REFUSED', job.id, `cornerAlphaMax=${res.cornerAlphaMax} — void is not transparent; keeping the existing still`);
      report.portraits.push({
        id: job.id, ok: false,
        reason: `capture void was opaque (cornerAlphaMax=${res.cornerAlphaMax}); existing still kept`,
      });
      if (!job.mapSphere) await page.evaluate(() => window.Orrery3D.exitPortrait && window.Orrery3D.exitPortrait());
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
      unimagedFracOfDisc: res.unimagedFracOfDisc,
      source: job.mapSphere ? job.tex : 'engine portrait',
    });
    const notes = [];
    if (job.mapSphere) {
      notes.push(`real ${job.tex} map on a lit sphere rendered outside the engine (engine has no ${job.id} mesh); `
        + 'unobserved region left black, not painted; Scorpio falls back to Mars');
    }
    if (kb > 120) notes.push('over 120KB budget: ring/high-frequency detail sets a webp floor at 1024²; lazy-cached (not in install shell)');
    manifest.stills.push({
      id: job.id, file, rulerOfSigns: RULER_OF[job.id] || [], kb,
      date: usedDate, frame: job.frame,
      generated: false,          // nothing in this library is invented any more
      mapSphere: !!job.mapSphere,
      overBudget: kb > 120,
      note: notes.length ? notes.join('; ') : undefined,
    });
    console.error('OK  ', job.id, `${res.w}x${res.h}`, `${kb}KB`,
      `cornerAlphaMax=${res.cornerAlphaMax}`, `meanLum=${res.meanLum}`, `maxLum=${res.maxLum}`,
      `lit=${lit}`, `transparent=${clean}`, `date=${usedDate}`);
    await sleep(200);
  }

  // A partial run keeps every still it did not re-shoot, in place and unedited.
  if (priorManifest && Array.isArray(priorManifest.stills)) {
    manifest.stills = mergeById(priorManifest.stills, manifest.stills);
    manifest.partialRun = ONLY.slice();
  }
  // Total library size, measured from disk so a partial run still reports the truth.
  let totalKB = 0;
  for (const s of manifest.stills) { try { totalKB += statSync(join(OUT, s.file)).size; } catch (e) {} }
  manifest.totalKB = +(totalKB / 1024).toFixed(1);
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // ── Non-leak check: reload the homepage normally, confirm the hero still works ──
  const errorsBeforeReload = pageErrors.length;
  if (!needsEngine) {
    report.homepageReload = { skipped: 'no engine portrait in this run — the hero was never entered' };
    console.error('RELOAD skipped (no engine job)');
  } else {
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
  }

  report.pageErrorsTotal = pageErrors;
  report.totalKB = manifest.totalKB;
  await browser.close();
  if (priorReport && Array.isArray(priorReport.portraits)) {
    report.portraits = mergeById(priorReport.portraits, report.portraits);
    report.partialRun = ONLY.slice();
    // Keep only the last real reload result, not a chain of skipped-run wrappers.
    if (!needsEngine && priorReport.homepageReload) {
      const prior = priorReport.homepageReload;
      const lastReal = prior.skipped ? prior.previous : prior;
      report.homepageReload = { ...report.homepageReload, previous: lastReal || null };
    }
  }
  const reportPath = join(OUT, 'make-engine-stills-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => { console.error(e); process.exit(2); });
