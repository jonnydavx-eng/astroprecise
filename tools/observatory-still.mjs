#!/usr/bin/env node
/**
 * Whole Sky Edition: 06-observatory-birth-hour-schematic-4800x3600.png for one order.
 *
 *   node tools/observatory-still.mjs --in <canonical order.json> --dir <private dir>
 *        [--browser chrome|msedge|chromium] [--headful] [--gpu]
 *
 * Renders the real Observatory engine (website/observatory.html, served from a
 * loopback-only origin) at the order's birth instant through the same authored
 * birth-hour camera as the site's Keep button, at a FIXED 4800 x 3600 (pixel ratio 1,
 * 4:3 camera), whatever the window size. The engine proves its drawing buffer is
 * really 4800 x 3600 and throws otherwise; this tool re-reads the PNG's IHDR and
 * refuses to write anything that is not exactly that size. The still is stamped
 * SCHEMATIC by the site's own Keep code (APKeepSky.stampSurfaceA).
 *
 * Fulfilment tooling only: no checkout, payment, price or email is touched.
 * The birth instant is the order's UT instant from fulfil-shared enrichOrder (the typed
 * local time converted with the place's zone, DST included), the same one buildChart()
 * uses, so the still and the chart share one instant. The stamp shows the typed local
 * date/time and zone, and "computed at <UT> UTC" from that instant.
 *
 * Renderer: REAL ORDERS USE THE DEFAULT, headless SwiftShader software rendering
 * (deterministic, no GPU needed). It is the same renderer that makes the Whole Sky
 * sample PDF and shop image, so a buyer gets what the samples show. Run order stills
 * with no renderer flags.
 * --gpu (usually with --headful) is for LOCAL TESTING ONLY: it drops the SwiftShader
 * flags so a real GPU renders, which can look different (on the AMD Mini the
 * background renders bluer). Never use it for a customer file; the CLI warns and
 * records "renderer" in its output line.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { loadEngines, enrichOrder, parseArgs, pngSize } from './fulfil-shared.mjs';

export const STILL_WIDTH = 4800;
export const STILL_HEIGHT = 3600;
export const STILL_FILE = `06-observatory-birth-hour-schematic-${STILL_WIDTH}x${STILL_HEIGHT}.png`;
export const SWIFTSHADER_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

/** Keep-sky context for one order; refuses an unknown birth time (the edition promises the recorded birth hour). */
export function stillContext(order, E) {
  const o = enrichOrder(order, E);
  if (o.timeUnknown) throw new Error('Whole Sky still needs a recorded birth time; this order has none');
  if (![o.y, o.mo, o.d, o.h, o.mi].every(Number.isFinite)) throw new Error('Order missing birth date/time (y/mo/d/h/mi)');
  if (o.timeBasis !== 'ut') throw new Error('Order birth time is not on UT; cannot place the still');
  const pad = (n) => String(n).padStart(2, '0');
  const local = o.local || null;
  // +1 s keeps the stamped minute on the birth minute after float rounding of the JD.
  return {
    jd: Date.UTC(o.y, o.mo - 1, o.d, o.h, o.mi, 1) / 86400000 + 2440587.5,
    utc: `${o.y}-${pad(o.mo)}-${pad(o.d)}T${pad(o.h)}:${pad(o.mi)}Z`,
    birthDate: local ? local.date : `${o.y}-${pad(o.mo)}-${pad(o.d)}`,
    birthTime: local ? local.time : `${pad(o.h)}:${pad(o.mi)}`,
    timeKnown: true,
    timeAccuracy: order.timeAccuracy === 'approximate' ? 'approximate' : 'exact',
    place: o.place || '',
    timezone: (local && local.tz) || o.tz || order.timezone || '',
  };
}

export const USAGE = `Usage: node tools/observatory-still.mjs --in <canonical order.json> --dir <private dir>
       [--browser chrome|msedge|chromium] [--headful] [--gpu]

Writes ${STILL_FILE} (exactly ${STILL_WIDTH} x ${STILL_HEIGHT}) for a whole-sky-edition order.

Renderer: real orders use the default, headless SwiftShader software rendering,
the same renderer as the Whole Sky samples, so buyers get what the samples show.
  --gpu       LOCAL TESTING ONLY: render on this machine's GPU instead. Output can
              look different from the samples; never use it for a customer file.
  --headful   show the browser window (local testing; pair with --gpu).`;

/** Chromium launch options for the still. The default ({}) is the order renderer: headless SwiftShader. */
export function stillLaunchOptions({ browser = 'chrome', headful = false, gpu = false } = {}) {
  const opts = { headless: !headful, args: gpu ? ['--ignore-gpu-blocklist'] : [...SWIFTSHADER_ARGS] };
  return browser === 'chromium' ? opts : { ...opts, channel: browser };
}

export async function launchStillBrowser(options = {}) {
  return chromium.launch(stillLaunchOptions(options));
}

/**
 * Render the fixed-size birth-hour still in an already launched browser.
 * Returns { png, width, height, drawingBuffer, renderMs, gl } and throws on any size mismatch.
 */
export async function renderObservatoryStill(browserInstance, origin, context, { width = STILL_WIDTH, height = STILL_HEIGHT, viewport = { width: 1440, height: 1000 } } = {}) {
  const page = await browserInstance.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  try {
    await page.goto(`${origin}/observatory.html?nosw=1`, { waitUntil: 'load' });
    await page.click('#ap-enter-sky');
    await page.waitForFunction(() => { const o = document.getElementById('orr'); return o?._ready === true && o.getAttribute('data-engine') === 'webgl' && window.APKeepSky; }, null, { timeout: 120_000 });
    const res = await page.evaluate(({ d, w, h }) => {
      const o = document.getElementById('orr');
      const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
      const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
      const glInfo = gl ? { renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), maxRenderbuffer: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE) } : null;
      const live = { w: o.querySelector('canvas')?.width, h: o.querySelector('canvas')?.height };
      const t0 = performance.now();
      let still;
      try { still = o.captureStill({ mode: 'birth-hour', jd: d.jd, timeKnown: true, width: w, height: h }); } catch (e) { return { error: String(e && e.message || e), gl: glInfo }; }
      const renderMs = performance.now() - t0;
      if (!still) return { error: 'captureStill returned nothing (WebGL unavailable?)', gl: glInfo };
      window.APKeepSky.stampSurfaceA(still, d);
      const caption = window.APKeepSky.caption(d);
      const after = { w: o.querySelector('canvas')?.width, h: o.querySelector('canvas')?.height };
      return { width: still.width, height: still.height, drawingBuffer: still.dataset.apDrawingBuffer || null, renderMs, gl: glInfo, live, after, caption, url: still.toDataURL('image/png') };
    }, { d: context, w: width, h: height });
    if (res.error) throw new Error(`Observatory still failed: ${res.error}${res.gl ? ` [${res.gl.renderer}]` : ''}`);
    const png = Buffer.from(res.url.split(',')[1], 'base64');
    const size = pngSize(png);
    if (!size || size.width !== width || size.height !== height || res.width !== width || res.height !== height || res.drawingBuffer !== `${width}x${height}`) {
      throw new Error(`Observatory still is ${size ? `${size.width}x${size.height}` : 'not a PNG'} (canvas ${res.width}x${res.height}, drawing buffer ${res.drawingBuffer}), not ${width}x${height}`);
    }
    if (res.live.w !== res.after.w || res.live.h !== res.after.h) throw new Error(`live view not restored (${res.live.w}x${res.live.h} -> ${res.after.w}x${res.after.h})`);
    return { png, width: size.width, height: size.height, drawingBuffer: res.drawingBuffer, renderMs: Math.round(res.renderMs), gl: res.gl, liveCanvas: res.live, caption: res.caption, pageErrors: errors };
  } finally {
    await page.close();
  }
}

async function main() {
  const A = parseArgs(process.argv.slice(2));
  if (A.help) { console.log(USAGE); return; }
  if (typeof A.dir !== 'string' || !A.dir.trim() || typeof A.in !== 'string' || !existsSync(resolve(A.in))) {
    throw new Error(USAGE);
  }
  const order = JSON.parse(readFileSync(resolve(A.in), 'utf8'));
  if (order.product !== 'whole-sky-edition') throw new Error(`The Observatory still belongs to whole-sky-edition orders only (got ${order.product || 'no product'})`);
  const { E } = loadEngines();
  const context = stillContext(order, E);
  const dir = resolve(A.dir);
  const { startServer } = await import('./make-studio-samples.mjs');
  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const gpu = !!A.gpu;
  if (gpu) console.error('observatory-still: --gpu is for local testing only; real orders use the default software renderer (no --gpu).');
  const browser = await launchStillBrowser({ browser: typeof A.browser === 'string' ? A.browser : 'chrome', headful: !!A.headful, gpu });
  try {
    const t0 = Date.now();
    const still = await renderObservatoryStill(browser, origin, context);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, STILL_FILE), still.png);
    console.log(JSON.stringify({ file: STILL_FILE, width: still.width, height: still.height, drawingBuffer: still.drawingBuffer, bytes: still.png.length, renderMs: still.renderMs, totalMs: Date.now() - t0, renderer: gpu ? 'gpu (local testing only)' : 'swiftshader (order default)', gl: still.gl && still.gl.renderer, utc: context.utc, stamp: still.caption }));
  } finally {
    await browser.close();
    server.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`observatory-still failed: ${e.message}`); process.exit(1); });
}
