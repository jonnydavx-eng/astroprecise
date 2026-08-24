/**
 * Focused Home performance contract: the real textured Earth is revealed before
 * the rest of the scene is built, and the first non-Earth action escalates and
 * awaits that deferred build instead of failing.
 */
import { chromium } from './node_modules/playwright/index.mjs';
import { existsSync } from 'node:fs';

const BASE = (process.env.AP_BASE || process.argv[2] || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const WINDOWS_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const failures = [];

function gate(name, condition, detail = '') {
  const ok = Boolean(condition);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}

function isSoftwareWebGLRenderer(label) {
  return /swiftshader|llvmpipe|softpipe|software rasterizer|microsoft basic render|(?:^|[^a-z0-9])warp(?:[^a-z0-9]|$)/i
    .test(String(label || ''));
}

function refitRadiusForAspect(radius, fromAspect, toAspect, fill = 0.78) {
  const verticalFov = 36 * Math.PI / 180;
  const limitingFov = aspect => Math.min(
    verticalFov,
    2 * Math.atan(Math.tan(verticalFov / 2) * aspect),
  );
  const from = Math.sin(limitingFov(fromAspect) * fill / 2);
  const to = Math.sin(limitingFov(toAspect) * fill / 2);
  return Number(radius) * from / Math.max(to, 1e-6);
}

async function openStagedHome(browser, contextOptions, options = {}) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(`page: ${error.message || error}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  if (options.lowTier) {
    await page.addInitScript(() => {
      try { Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 2 }); } catch (_) {}
      try { Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 2 }); } catch (_) {}
    });
  }
  await page.addInitScript(() => {
    const callbacks = new Map();
    let nextId = 1;
    window.__apPerfStartedAt = performance.now();
    window.__apPerfFirstFrameAt = 0;
    window.__apPerfSceneReadyAt = 0;
    window.requestIdleCallback = callback => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    };
    window.cancelIdleCallback = id => callbacks.delete(id);
    document.addEventListener('ap-orrery-first-frame', () => {
      window.__apPerfFirstFrameAt = performance.now();
    });
    document.addEventListener('ap-orrery-scene-ready', () => {
      window.__apPerfSceneReadyAt = performance.now();
    });
  });
  await page.goto(`${BASE}/index.html?nosw=1&contract=earth-first`, {
    waitUntil: 'domcontentloaded', timeout: 60_000,
  });
  await page.waitForFunction(() => {
    const model = document.getElementById('orr');
    return model?._ready === true && model.getAttribute('data-engine') === 'webgl' &&
      document.querySelector('.ap-model-stage')?.getAttribute('aria-busy') === 'false' &&
      window.Orrery3D?.getBootState?.().sceneState === 'queued';
  }, null, { timeout: 35_000 });
  return { context, page, errors };
}

const launch = {
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
};
if (existsSync(WINDOWS_CHROME)) launch.executablePath = WINDOWS_CHROME;
const browser = await chromium.launch(launch);

try {
  const desktop = await openStagedHome(browser, {
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
  });
  const before = await desktop.page.evaluate(() => ({
    boot: window.Orrery3D.getBootState(),
    quality: window.Orrery3D.getVisualQuality(),
    focus: window.Orrery3D.getFocusedBody(),
    firstFrameMs: window.__apPerfFirstFrameAt - window.__apPerfStartedAt,
    engine: document.getElementById('orr')?.getAttribute('data-engine') || '',
    isWebGL: window.Orrery3D?.isWebGL === true,
    canvases: document.querySelectorAll('#orr canvas').length,
    context: (() => {
      const canvas = document.querySelector('#orr canvas');
      const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
      const debugInfo = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return {
        live: Boolean(gl),
        renderer: debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '') : '',
      };
    })(),
  }));

  gate('first revealed frame is the one real Earth-only WebGL scene',
    before.boot.earthFirst && before.boot.sceneState === 'queued' &&
      before.boot.allPlanetsBuilt === false && before.focus === 'earth' && before.canvases === 1,
    JSON.stringify(before));
  gate('Home owns one live WebGL engine and exactly one canvas',
    before.engine === 'webgl' && before.isWebGL === true && before.context.live === true &&
      before.canvases === 1,
    JSON.stringify({ engine: before.engine, isWebGL: before.isWebGL, canvases: before.canvases, context: before.context }));
  gate('a real software WebGL renderer is capability-ranked into the low tier',
    isSoftwareWebGLRenderer(before.context.renderer) && before.quality.perfTier === 'low',
    JSON.stringify({ renderer: before.context.renderer, perfTier: before.quality.perfTier }));
  gate('Earth reveal records a bounded ready time and compiled program count',
    before.firstFrameMs > 0 && before.firstFrameMs < 25_000 && before.boot.programs > 0,
    JSON.stringify({ firstFrameMs: Math.round(before.firstFrameMs), programs: before.boot.programs }));
  const earthTextures = before.boot.earthTextures;
  gate('all five Earth layers prewarm on separate frames before atomic attachment',
    earthTextures?.planned === 5 && earthTextures.loaded === 5 && earthTextures.warmed === 5 &&
      earthTextures.uploadFrames === 5 && earthTextures.usedInitTexture === true &&
      earthTextures.fallback === false && earthTextures.attached === true && earthTextures.spanMs > 0,
    JSON.stringify(earthTextures));

  const accepted = await desktop.page.evaluate(() => document.getElementById('orr').flyTo('mars'));
  await desktop.page.waitForFunction(() => {
    const state = window.Orrery3D?.getBootState?.();
    return state?.sceneState === 'ready' && state.allPlanetsBuilt === true &&
      window.Orrery3D?.getFocusedBody?.() === 'mars';
  }, null, { timeout: 45_000 });
  const after = await desktop.page.evaluate(() => ({
    boot: window.Orrery3D.getBootState(),
    focus: window.Orrery3D.getFocusedBody(),
    sceneReadyMs: window.__apPerfSceneReadyAt - window.__apPerfFirstFrameAt,
  }));
  gate('first non-Earth interaction is accepted and awaits full-scene completion',
    accepted === true && after.boot.sceneState === 'ready' &&
      after.boot.allPlanetsBuilt === true && after.focus === 'mars',
    JSON.stringify({ accepted, after }));
  gate('deferred compile exposes measurable completion evidence',
    after.sceneReadyMs >= 0 && after.boot.programs >= before.boot.programs,
    JSON.stringify({ sceneReadyMs: Math.round(after.sceneReadyMs), beforePrograms: before.boot.programs, afterPrograms: after.boot.programs }));
  gate('staged desktop boot has no runtime errors', desktop.errors.length === 0, desktop.errors.join(' | '));
  await desktop.context.close();

  const phone = await openStagedHome(browser, {
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1,
  });
  const phoneState = await phone.page.evaluate(() => ({
    quality: window.Orrery3D.getVisualQuality(),
    boot: window.Orrery3D.getBootState(),
    radius: window.Orrery3D.getCamRadius(),
    renderer: (() => {
      const canvas = document.querySelector('#orr canvas');
      const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
      const debugInfo = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '') : '';
    })(),
  }));
  gate('narrow coarse-pointer phone is capped at mid, or low on software WebGL',
    phoneState.quality.perfTier === (isSoftwareWebGLRenderer(phoneState.renderer) ? 'low' : 'mid'),
    JSON.stringify({ renderer: phoneState.renderer, quality: phoneState.quality }));
  gate('phone keeps all five 1024×512 Earth maps and stages their GPU uploads',
    phoneState.quality.maps?.earth?.w === 1024 &&
      phoneState.boot.earthTextures?.planned === 5 && phoneState.boot.earthTextures.loaded === 5 &&
      phoneState.boot.earthTextures.warmed === 5 && phoneState.boot.earthTextures.uploadFrames === 5 &&
      phoneState.boot.earthTextures.attached === true && phoneState.boot.earthTextures.fallback === false,
    JSON.stringify(phoneState.boot.earthTextures));
  gate('staged phone boot has no runtime errors', phone.errors.length === 0, phone.errors.join(' | '));
  await phone.context.close();

  const reducedLow = await openStagedHome(browser, {
    viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce',
  }, { lowTier: true });
  const reducedLowState = await reducedLow.page.evaluate(() => ({
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    quality: window.Orrery3D.getVisualQuality(),
    boot: window.Orrery3D.getBootState(),
  }));
  const reducedTextures = reducedLowState.boot.earthTextures;
  gate('reduced-motion low tier remains a motion/rendering reduction only',
    reducedLowState.reduced === true && reducedLowState.quality.perfTier === 'low',
    JSON.stringify({ reduced: reducedLowState.reduced, quality: reducedLowState.quality }));
  gate('reduced-motion low tier still atomically reveals all five Earth maps',
    reducedTextures?.planned === 5 && reducedTextures.loaded === 5 &&
      reducedTextures.warmed === 5 && reducedTextures.uploadFrames === 5 &&
      reducedTextures.usedInitTexture === true && reducedTextures.fallback === false &&
      reducedTextures.attached === true && reducedTextures.spanMs > 0,
    JSON.stringify(reducedTextures));
  gate('reduced-motion low-tier boot has no runtime errors',
    reducedLow.errors.length === 0, reducedLow.errors.join(' | '));
  await reducedLow.context.close();

  const resizedIntro = await openStagedHome(browser, {
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
  });
  const desktopSitting = await resizedIntro.page.evaluate(() => {
    const canvas = document.querySelector('#orr canvas')?.getBoundingClientRect();
    return {
      radius: window.Orrery3D.getCamRadius(),
      aspect: canvas ? canvas.width / Math.max(1, canvas.height) : 1,
    };
  });
  await resizedIntro.page.evaluate(() => window.Orrery3D.restartIntro());
  await resizedIntro.page.waitForFunction(() => window.Orrery3D?.isIntroActive?.() === true, null, { timeout: 5_000 });
  const introBefore = await resizedIntro.page.evaluate(() => ({
    radius: window.Orrery3D.getCamRadius(),
    progress: window.Orrery3D.getIntroProgress(),
  }));
  await resizedIntro.page.setViewportSize({ width: 390, height: 844 });
  const introImmediate = await resizedIntro.page.evaluate(() => {
    window.Orrery3D.forceResize();
    const canvas = document.querySelector('#orr canvas');
    const rect = canvas?.getBoundingClientRect();
    return {
      radius: window.Orrery3D.getCamRadius(),
      progress: window.Orrery3D.getIntroProgress(),
      active: window.Orrery3D.isIntroActive(),
      engine: document.getElementById('orr')?.getAttribute('data-engine') || '',
      canvases: document.querySelectorAll('#orr canvas').length,
      aspect: (rect?.width || 0) / Math.max(1, rect?.height || 1),
      bufferAspect: (canvas?.width || 0) / Math.max(1, canvas?.height || 1),
    };
  });
  await resizedIntro.page.waitForTimeout(250);
  const introAt250 = await resizedIntro.page.evaluate(() => ({
    radius: window.Orrery3D.getCamRadius(),
    progress: window.Orrery3D.getIntroProgress(),
    active: window.Orrery3D.isIntroActive(),
  }));
  const expectedPhoneFit = refitRadiusForAspect(
    desktopSitting.radius,
    desktopSitting.aspect,
    introImmediate.aspect,
  );
  const phoneFitFloor = expectedPhoneFit * 0.99;
  gate('desktop→phone intro resize synchronously adopts the complete-Earth fit',
    introImmediate.active === true && introImmediate.radius >= phoneFitFloor && introImmediate.aspect < 0.6 &&
      introImmediate.engine === 'webgl' && introImmediate.canvases === 1 &&
      Math.abs(introImmediate.bufferAspect - introImmediate.aspect) < 0.02,
    JSON.stringify({ nativePhoneBaseline: phoneState.radius, desktopSitting, expectedPhoneFit, introBefore, immediate: introImmediate }));
  gate('intro retains the phone fit 250 ms later instead of restoring the desktop crop',
    introAt250.active === true && introAt250.radius >= phoneFitFloor && introAt250.progress > introBefore.progress,
    JSON.stringify({ expectedPhoneFit, at250: introAt250 }));
  const canvasBox = await resizedIntro.page.locator('#orr canvas').boundingBox();
  if (canvasBox) {
    await resizedIntro.page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);
    await resizedIntro.page.mouse.down();
  }
  const afterInput = await resizedIntro.page.evaluate(() => ({
    active: window.Orrery3D.isIntroActive(),
    radius: window.Orrery3D.getCamRadius(),
  }));
  if (canvasBox) await resizedIntro.page.mouse.up();
  gate('real pointer input still takes control from the resized intro',
    Boolean(canvasBox) && afterInput.active === false,
    JSON.stringify(afterInput));
  gate('resized intro has no runtime errors', resizedIntro.errors.length === 0, resizedIntro.errors.join(' | '));
  await resizedIntro.context.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} Earth-first boot gate(s) failed:`);
  failures.forEach(failure => console.error(` - ${failure}`));
  process.exit(1);
}
console.log('\nALL EARTH-FIRST BOOT GATES PASS');
