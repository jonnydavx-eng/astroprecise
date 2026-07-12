/**
 * _diag-click.mjs — REAL user-interaction test on the 3D model. Simulates actual
 * mouse drag + click + dblclick on the canvas (not engine API calls), and checks
 * what element is on TOP of the model (an overlay would eat the clicks). Screenshots
 * before/after so we can SEE if the model responds. Run: node tools/_diag-click.mjs
 */
import { chromium } from './visual-check/node_modules/playwright/index.mjs';
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = 'C:/Users/jonny/AppData/Local/Temp/claude/C--Users-jonny-OneDrive/8e98fd7c-94da-4047-aec7-463044930edb/scratchpad';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errs = [];
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => errs.push('PAGEERROR ' + (e && (e.message || e))));
page.on('console', (m) => { if (m.type() === 'error') errs.push('ERR ' + m.text().slice(0, 200)); });

try {
  await page.goto(BASE + '/index.html?diag=click', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => { const c = document.documentElement.classList; return c.contains('orrery-live') || c.contains('orrery-full'); }, { timeout: 35000 }).catch(() => {});
  await sleep(8000);

  // What is ON TOP of the model at several points over the Earth/canvas?
  const probe = await page.evaluate(() => {
    const cv = document.querySelector('#orrery-canvas') || document.querySelector('canvas');
    const r = cv.getBoundingClientRect();
    const desc = (el) => el ? (el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')) : 'none';
    const chain = (el) => { const a = []; while (el && a.length < 7) { a.push(desc(el)); el = el.parentElement; } return a.join(' > '); };
    const pts = [
      ['centre', r.left + r.width * 0.5, r.top + r.height * 0.42],
      ['upper',  r.left + r.width * 0.5, r.top + r.height * 0.22],
      ['right',  r.left + r.width * 0.72, r.top + r.height * 0.42],
      ['lowerC', r.left + r.width * 0.5, r.top + r.height * 0.66],
    ].map(([name, x, y]) => {
      const el = document.elementFromPoint(Math.round(x), Math.round(y));
      return { name, x: Math.round(x), y: Math.round(y), top: desc(el), isCanvas: el === cv, chain: chain(el) };
    });
    return {
      canvasRect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      canvasPointerEvents: getComputedStyle(cv).pointerEvents,
      points: pts,
      dayOffsetBefore: window.Orrery3D && window.Orrery3D.getDayOffset ? window.Orrery3D.getDayOffset() : 'n/a',
      focusedBefore: window.Orrery3D && window.Orrery3D.getFocusedBody ? window.Orrery3D.getFocusedBody() : 'n/a',
    };
  });

  // pick a point that IS the canvas (first clear one), else centre
  const clear = probe.points.find((p) => p.isCanvas) || probe.points[0];
  const cx = clear.x, cy = clear.y;

  // === REAL DRAG on the model ===
  await page.mouse.move(cx, cy); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(cx + i * 14, cy + Math.round(i * 1.5)); await sleep(25); }
  await page.mouse.up(); await sleep(1500);
  await page.screenshot({ path: OUT + '/click-1-after-drag.png' });
  const afterDrag = await page.evaluate(() => ({ dayOffsetAfter: window.Orrery3D && window.Orrery3D.getDayOffset ? window.Orrery3D.getDayOffset() : 'n/a' }));

  // === REAL SINGLE CLICK (tap) on the model ===
  await page.mouse.click(cx, cy); await sleep(1800);
  const afterClick = await page.evaluate(() => {
    const p = document.getElementById('ap-planet-actions');
    return { panelOpen: p ? p.classList.contains('is-open') : false, panelTitle: p ? (p.querySelector('#ap-pa-title') || {}).textContent : null, focused: window.Orrery3D && window.Orrery3D.getFocusedBody ? window.Orrery3D.getFocusedBody() : 'n/a' };
  });
  await page.screenshot({ path: OUT + '/click-2-after-click.png' });

  // === REAL DOUBLE CLICK ===
  await page.mouse.dblclick(cx, cy); await sleep(2500);
  const afterDbl = await page.evaluate(() => ({ focused: window.Orrery3D && window.Orrery3D.getFocusedBody ? window.Orrery3D.getFocusedBody() : 'n/a' }));
  await page.screenshot({ path: OUT + '/click-3-after-dblclick.png' });

  await browser.close();
  console.log(JSON.stringify({
    probe,
    clickedAt: { cx, cy, wasCanvas: clear.isCanvas, whatWasThere: clear.top },
    DRAG_moved_model: probe.dayOffsetBefore !== afterDrag.dayOffsetAfter,
    dayOffset: { before: probe.dayOffsetBefore, after: afterDrag.dayOffsetAfter },
    CLICK_result: afterClick,
    DBLCLICK_focused: afterDbl.focused,
    errors: errs.slice(0, 20),
  }, null, 2));
} catch (e) {
  await browser.close().catch(() => {});
  console.log(JSON.stringify({ FATAL: String(e), errs: errs.slice(0, 20) }, null, 2));
}
