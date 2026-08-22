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

async function openStagedHome(browser, contextOptions) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(`page: ${error.message || error}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
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

const launch = { headless: true, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] };
if (existsSync(WINDOWS_CHROME)) launch.executablePath = WINDOWS_CHROME;
const browser = await chromium.launch(launch);

try {
  const desktop = await openStagedHome(browser, {
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
  });
  const before = await desktop.page.evaluate(() => ({
    boot: window.Orrery3D.getBootState(),
    focus: window.Orrery3D.getFocusedBody(),
    firstFrameMs: window.__apPerfFirstFrameAt - window.__apPerfStartedAt,
    canvases: document.querySelectorAll('#orr canvas').length,
  }));

  gate('first revealed frame is the one real Earth-only WebGL scene',
    before.boot.earthFirst && before.boot.sceneState === 'queued' &&
      before.boot.allPlanetsBuilt === false && before.focus === 'earth' && before.canvases === 1,
    JSON.stringify(before));
  gate('Earth reveal records a bounded ready time and compiled program count',
    before.firstFrameMs > 0 && before.firstFrameMs < 25_000 && before.boot.programs > 0,
    JSON.stringify({ firstFrameMs: Math.round(before.firstFrameMs), programs: before.boot.programs }));

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
  const phoneState = await phone.page.evaluate(() => window.Orrery3D.getVisualQuality());
  gate('narrow coarse-pointer phone is capped at the mid performance tier',
    phoneState.perfTier === 'mid', JSON.stringify(phoneState));
  gate('staged phone boot has no runtime errors', phone.errors.length === 0, phone.errors.join(' | '));
  await phone.context.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} Earth-first boot gate(s) failed:`);
  failures.forEach(failure => console.error(` - ${failure}`));
  process.exit(1);
}
console.log('\nALL EARTH-FIRST BOOT GATES PASS');
