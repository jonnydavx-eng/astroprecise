/**
 * Real mouse regression for the homepage <void-orrery>.
 *
 * Covers orbit drag, Shift+drag time scrub, wheel input and the release paths that previously left
 * the model stuck in "grabbing" mode after pointer capture was cancelled.
 *
 * Usage: node tools/_diag-click.mjs [base-url]
 */
import { chromium } from './visual-check/node_modules/playwright/index.mjs';

const BASE = (process.env.AP_BASE || process.argv[2] || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const errors = [];
let browser;

async function launchBrowser() {
  try {
    return await chromium.launch({
      headless: true,
      args: ['--enable-unsafe-swiftshader'],
    });
  } catch (error) {
    if (!/Executable doesn't exist/i.test(String(error))) throw error;
    return chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--enable-unsafe-swiftshader'],
    });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (error) => errors.push(`PAGEERROR ${error.message || error}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`CONSOLE ${message.text()}`);
  });

  await page.goto(`${BASE}/index.html?nosw=1&diag=mouse`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.waitForSelector('#orr canvas', { timeout: 30_000 });
  await page.waitForFunction(() => {
    const orrery = document.getElementById('orr');
    return orrery && orrery.getAttribute('data-engine') === 'webgl' &&
      orrery._ready === true && typeof orrery.getJD === 'function' &&
      window.Orrery3D && typeof window.Orrery3D.getCamRadius === 'function';
  }, { timeout: 30_000 });

  const canvas = page.locator('#orr canvas');
  const rect = await canvas.boundingBox();
  assert(rect && rect.width > 100 && rect.height > 100, 'Orrery canvas has no usable bounds');
  const point = {
    x: rect.x + rect.width * 0.5,
    y: rect.y + rect.height * 0.42,
  };
  assert(await canvas.evaluate((el) => getComputedStyle(el).touchAction === 'none'),
    'Orrery canvas does not own touch/pinch gestures');

  await page.evaluate(() => {
    window.__mouseDiag = { pointerId: null, events: [] };
    const target = document.querySelector('#orr canvas');
    ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
      target.addEventListener(type, (event) => {
        if (type === 'pointerdown') window.__mouseDiag.pointerId = event.pointerId;
        window.__mouseDiag.events.push({
          type,
          pointerId: event.pointerId,
          buttons: event.buttons,
        });
      });
    });
  });

  // A normal held-button drag orbits the camera. Time must remain unchanged.
  const normalBefore = await page.evaluate(() => document.getElementById('orr').getJD());
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 90, point.y + 24, { steps: 6 });
  await page.mouse.up();
  const normalAfter = await page.evaluate(() => ({
    jd: document.getElementById('orr').getJD(),
    cursor: document.querySelector('#orr canvas').style.cursor,
  }));
  assert(normalAfter.jd === normalBefore, 'Normal mouse orbit unexpectedly scrubbed model time');
  assert(normalAfter.cursor === 'grab', 'Normal mouse release did not restore the grab cursor');

  // Time travel is deliberately modified so an accidental orbit gesture cannot
  // rewrite the selected moment: Shift+drag owns that gesture on desktop.
  const scrubBefore = normalAfter.jd;
  await page.mouse.move(point.x, point.y);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(point.x + 110, point.y, { steps: 7 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  const scrubAfter = await page.evaluate(() => document.getElementById('orr').getJD());
  assert(scrubAfter !== scrubBefore, 'Shift+drag did not scrub the model time');
  await page.evaluate(() => window.Orrery3D.setSpeed(0));
  await page.waitForTimeout(80);

  // Regression: cancellation must reset drag state, and a later no-button move
  // must not rotate the camera.
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  const cancelBefore = await page.evaluate(() => {
    const target = document.querySelector('#orr canvas');
    return {
      jd: document.getElementById('orr').getJD(),
      pointerId: window.__mouseDiag.pointerId,
      cursor: target.style.cursor,
    };
  });
  await page.evaluate(({ x, y, pointerId }) => {
    const target = document.querySelector('#orr canvas');
    target.dispatchEvent(new PointerEvent('pointercancel', {
      bubbles: true,
      pointerId,
      pointerType: 'mouse',
      clientX: x,
      clientY: y,
      buttons: 0,
    }));
    target.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      pointerId,
      pointerType: 'mouse',
      clientX: x + 120,
      clientY: y + 40,
      buttons: 0,
    }));
  }, { ...point, pointerId: cancelBefore.pointerId });
  const cancelAfter = await page.evaluate(() => ({
    jd: document.getElementById('orr').getJD(),
    cursor: document.querySelector('#orr canvas').style.cursor,
  }));
  await page.mouse.up();
  assert(cancelBefore.cursor === 'move', 'Pointer down did not enter orbit mode');
  assert(cancelAfter.cursor === 'grab', 'Pointer cancellation left the cursor stuck grabbing');
  assert(cancelAfter.jd === cancelBefore.jd, 'Pointer move after cancellation scrubbed the model time');

  // Losing pointer capture without a subsequent no-button move must also end
  // the interaction immediately.
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  const lostCaptureBefore = await page.evaluate(() => ({
    jd: document.getElementById('orr').getJD(),
    pointerId: window.__mouseDiag.pointerId,
  }));
  await page.evaluate(({ x, y, pointerId }) => {
    const target = document.querySelector('#orr canvas');
    target.dispatchEvent(new PointerEvent('lostpointercapture', {
      bubbles: true,
      pointerId,
      pointerType: 'mouse',
      clientX: x,
      clientY: y,
      buttons: 1,
    }));
    target.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      pointerId,
      pointerType: 'mouse',
      clientX: x + 100,
      clientY: y + 30,
      buttons: 1,
    }));
  }, { ...point, pointerId: lostCaptureBefore.pointerId });
  const lostCaptureAfter = await page.evaluate(() => ({
    jd: document.getElementById('orr').getJD(),
    cursor: document.querySelector('#orr canvas').style.cursor,
  }));
  await page.mouse.up();
  assert(lostCaptureAfter.cursor === 'grab', 'Lost capture left the cursor stuck grabbing');
  assert(lostCaptureAfter.jd === lostCaptureBefore.jd, 'Move after lost capture scrubbed the model time');

  // Defensive recovery: browsers can lose the release event while reporting
  // buttons=0 on the next move. That move must end, not continue, the drag.
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  const lostButtonBefore = await page.evaluate(() => ({
    jd: document.getElementById('orr').getJD(),
    pointerId: window.__mouseDiag.pointerId,
  }));
  await page.evaluate(({ x, y, pointerId }) => {
    document.querySelector('#orr canvas').dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      pointerId,
      pointerType: 'mouse',
      clientX: x + 100,
      clientY: y + 30,
      buttons: 0,
    }));
  }, { ...point, pointerId: lostButtonBefore.pointerId });
  const lostButtonAfter = await page.evaluate(() => ({
    jd: document.getElementById('orr').getJD(),
    cursor: document.querySelector('#orr canvas').style.cursor,
  }));
  await page.mouse.up();
  assert(lostButtonAfter.cursor === 'grab', 'Lost-button recovery left the cursor stuck grabbing');
  assert(lostButtonAfter.jd === lostButtonBefore.jd, 'buttons=0 pointer move scrubbed the model time');

  // The wheel path remains live after the recovery cases.
  const wheelDisabled = await page.evaluate(() => document.getElementById('orr')?.getAttribute('data-wheel') === 'off');
  const radiusBefore = await page.evaluate(() => window.Orrery3D.getCamRadius());
  await page.mouse.move(point.x, point.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 180);
  await page.keyboard.up('Control');
  const radiusAfter = await page.evaluate(() => window.Orrery3D.getCamRadius());
  if (wheelDisabled) assert(radiusAfter === radiusBefore, 'data-wheel=off allowed the model to hijack page scrolling');
  else assert(radiusAfter !== radiusBefore, 'Mouse wheel did not change the model zoom');

  assert(errors.length === 0, `Browser errors: ${errors.slice(0, 3).join(' | ')}`);
  console.log(JSON.stringify({
    result: 'PASS',
    browser: 'bundled Chromium or installed Chrome fallback',
    normalDrag: { before: normalBefore, after: normalAfter.jd },
    shiftedTimeScrub: { before: scrubBefore, after: scrubAfter },
    pointerCancel: { before: cancelBefore.jd, after: cancelAfter.jd, cursor: cancelAfter.cursor },
    lostCapture: { before: lostCaptureBefore.jd, after: lostCaptureAfter.jd, cursor: lostCaptureAfter.cursor },
    lostButton: { before: lostButtonBefore.jd, after: lostButtonAfter.jd, cursor: lostButtonAfter.cursor },
    wheel: { disabled: wheelDisabled, before: radiusBefore, after: radiusAfter },
    errors,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    result: 'FAIL',
    error: String(error && (error.stack || error)),
    errors: errors.slice(0, 10),
  }, null, 2));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
}
