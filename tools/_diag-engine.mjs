/**
 * _diag-engine.mjs — render the live homepage WebGL orrery headlessly (SwiftShader),
 * run the render loop, exercise "go through space" + planet focus, capture EVERY
 * console/page error, and save screenshots. This is how we SEE the graphics the
 * in-app hidden browser can't render. Run: node tools/_diag-engine.mjs
 */
import { chromium } from './visual-check/node_modules/playwright/index.mjs';

const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = 'C:/Users/jonny/AppData/Local/Temp/claude/C--Users-jonny-OneDrive/8e98fd7c-94da-4047-aec7-463044930edb/scratchpad';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const logs = [];
const push = (t, x) => logs.push({ t, x: String(x).slice(0, 320) });

const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => push(m.type().toUpperCase(), m.text()));
page.on('pageerror', (e) => push('PAGEERROR', e && (e.message || e)));
page.on('requestfailed', (r) => push('REQFAIL', r.url() + ' :: ' + ((r.failure() && r.failure().errorText) || '')));
page.on('crash', () => push('CRASH', 'page crashed'));

try {
  await page.goto(BASE + '/index.html?diag=render', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(
    () => { const c = document.documentElement.classList; return c.contains('orrery-full') || c.contains('orrery-live') || c.contains('orrery-lite'); },
    { timeout: 35000 }
  ).catch(() => push('WARN', 'engine class never appeared in 35s'));
  await sleep(8000); // SwiftShader is slow — let the intro + render settle

  const rest = await page.evaluate(() => {
    const c = document.documentElement.classList;
    const cv = document.querySelector('#orrery-canvas') || document.querySelector('canvas');
    let gl = null, glErr = 'n/a', lost = null;
    try { if (cv) { gl = cv.getContext('webgl2') || cv.getContext('webgl'); if (gl) { glErr = gl.getError(); lost = gl.isContextLost ? gl.isContextLost() : null; } } } catch (e) { glErr = String(e); }
    return {
      mode: c.contains('orrery-full') ? 'WebGL-full' : c.contains('orrery-lite') ? '2D-FALLBACK' : '?',
      classes: document.documentElement.className,
      hasOrrery3D: !!window.Orrery3D, canvas: cv ? (cv.width + 'x' + cv.height) : null,
      glContext: gl ? 'ALIVE' : 'NONE', glError: glErr, contextLost: lost,
    };
  });
  await page.screenshot({ path: OUT + '/engine-1-rest.png' });

  // === GO THROUGH SPACE: zoom out Earth → Cosmos ===
  const beforeFlight = logs.length;
  await page.evaluate(() => { try { window.Orrery3D && window.Orrery3D.startScaleJourney && window.Orrery3D.startScaleJourney(6, { fullTour: true, direction: 'out' }); } catch (e) { console.error('FLIGHT_THREW ' + e); } });
  await sleep(7000);
  await page.screenshot({ path: OUT + '/engine-2-through-space.png' });
  const flightErrs = logs.slice(beforeFlight).filter((l) => l.t === 'ERROR' || l.t === 'PAGEERROR').length;

  // === CLICK/FOCUS A PLANET ===
  const beforeFocus = logs.length;
  await page.evaluate(() => { try { window.Orrery3D && window.Orrery3D.focusPlanet && window.Orrery3D.focusPlanet('mars'); } catch (e) { console.error('FOCUS_THREW ' + e); } });
  await sleep(4000);
  await page.screenshot({ path: OUT + '/engine-3-planet.png' });

  await browser.close();
  const errs = logs.filter((l) => l.t === 'ERROR' || l.t === 'PAGEERROR' || l.t === 'REQFAIL' || l.t === 'CRASH');
  console.log(JSON.stringify({
    rest, flightErrsDuringSpace: flightErrs,
    errorCount: errs.length, errors: errs.slice(0, 40),
    allWarnings: logs.filter((l) => l.t === 'WARNING' || l.t === 'WARN').slice(0, 15),
    totalLogs: logs.length,
  }, null, 2));
} catch (e) {
  await browser.close().catch(() => {});
  console.log(JSON.stringify({ FATAL: String(e), logs: logs.slice(0, 40) }, null, 2));
}
