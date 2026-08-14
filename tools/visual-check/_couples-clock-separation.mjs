import { chromium } from './node_modules/playwright/index.mjs';

const BASE = (process.env.AP_BASE || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const errors = [];
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function near(actual, expected, tolerance = 1e-6) {
  return Math.abs(actual - expected) <= tolerance;
}

try {
  browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (error) => errors.push(`PAGEERROR ${error.message || error}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`CONSOLE ${message.text()}`);
  });

  await page.goto(`${BASE}/compatibility.html?nosw=1&diag=couples-clocks`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.waitForSelector('#orr canvas', { state: 'visible', timeout: 35_000 });
  await page.waitForFunction(() => {
    const orrery = document.getElementById('orr');
    return orrery?._ready === true &&
      orrery.getAttribute('data-engine') === 'webgl' &&
      window.Orrery3D &&
      typeof window.Orrery3D.__natalClockDebug === 'function';
  }, null, { timeout: 35_000 });

  const jd = Date.UTC(1990, 5, 14, 12, 0) / 86400000 + 2440587.5;
  const snapshots = await page.evaluate((clockJd) => {
    const engine = window.Orrery3D;
    const spec = {
      a: { jd: clockJd, label: 'A' },
      b: { jd: clockJd, label: 'B' },
    };
    engine.setNatalClocks({ ...spec, focus: null });
    const live = engine.__natalClockDebug();
    engine.setNatalClocks({ ...spec, focus: 'a' });
    const focusA = engine.__natalClockDebug();
    engine.setNatalClocks({ ...spec, focus: 'b' });
    const focusB = engine.__natalClockDebug();
    return { live, focusA, focusB, publicState: engine.getNatalClocks() };
  }, jd);

  const { live, focusA, focusB, publicState } = snapshots;
  assert(live?.a && live?.b, 'both couples clocks were not built');
  assert(near(live.b.earthRadius / live.a.earthRadius, 1.03 / 0.97, 1e-5),
    `radial split is wrong: ${live.a.earthRadius}, ${live.b.earthRadius}`);

  const a = live.a.earth;
  const b = live.b.earth;
  const dot = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) /
    (live.a.earthRadius * live.b.earthRadius);
  assert(dot > 0.999999, `same-JD true lon/lat direction drifted: dot=${dot}`);
  assert(live.a.labelDistance > 2 && live.b.labelDistance > 2,
    `letter labels remain stacked: ${live.a.labelDistance}, ${live.b.labelDistance}`);
  const labelGap = Math.hypot(
    live.a.label[0] - live.b.label[0],
    live.a.label[1] - live.b.label[1],
    live.a.label[2] - live.b.label[2]
  );
  assert(labelGap > 3, `A/B label gap is too small: ${labelGap}`);

  assert(near(live.a.bodyOpacity, 0.78) && near(live.b.bodyOpacity, 0.78),
    'live clocks are not equally weighted');
  assert(near(focusA.a.bodyOpacity, 0.92) && near(focusA.b.bodyOpacity, 0.42),
    'focus A opacity is wrong');
  assert(near(focusB.a.bodyOpacity, 0.42) && near(focusB.b.bodyOpacity, 0.92),
    'focus B opacity is wrong');
  assert(publicState.focus === 'b', 'public natal-clock focus state is missing');
  assert(errors.length === 0, errors.join('\n'));

  console.log(JSON.stringify({
    result: 'PASS',
    radialRatio: Number((live.b.earthRadius / live.a.earthRadius).toFixed(6)),
    directionDot: Number(dot.toFixed(8)),
    labelGap: Number(labelGap.toFixed(3)),
    opacity: {
      live: [live.a.bodyOpacity, live.b.bodyOpacity],
      focusA: [focusA.a.bodyOpacity, focusA.b.bodyOpacity],
      focusB: [focusB.a.bodyOpacity, focusB.b.bodyOpacity],
    },
  }, null, 2));
} finally {
  if (browser) await browser.close();
}
