/**
 * v576 photoreal-model craft pass verification.
 * Items: eggshell limb kill, brass halo, starfield lift, bounded idle drift,
 * real Moon frame, outer-planet portraits, DOM planet labels, poster→HD crossfade.
 * Runs against the standing preview server. Screenshots → out/redesign/craft-v576-*.png
 * Usage: node craft-v576-verify.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'redesign');

const results = [];
const ok = (m) => { results.push('ok   ' + m); console.log('ok   ' + m); };
const fail = (m) => { results.push('FAIL ' + m); console.log('FAIL ' + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: join(OUT, name + '.png') });

async function bootPage(browser, vp, opts = {}) {
  const ctx = await browser.newContext({
    viewport: vp, colorScheme: 'dark',
    reducedMotion: opts.prm ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  if (opts.blockEngine) {
    await ctx.route('**/js/orrery-webgl.js*', (r) => r.abort());
  }
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  return { ctx, page, errors };
}

async function waitWebGL(page, tag) {
  try {
    await page.waitForFunction(
      () => window.Orrery3D && window.Orrery3D.isWebGL !== false &&
        document.documentElement.classList.contains('orrery-full'),
      null, { timeout: 45000 }
    );
    ok(`${tag}: WebGL engine booted + orrery-full landed`);
    return true;
  } catch {
    fail(`${tag}: WebGL engine did not boot within 45s`);
    return false;
  }
}

function reportErrors(tag, errors) {
  const real = errors.filter((e) => !/favicon|net::ERR_FAILED.*orrery-webgl/i.test(e));
  if (real.length === 0) ok(`${tag}: zero console errors`);
  else fail(`${tag}: ${real.length} console errors — ${real.slice(0, 4).join(' | ')}`);
}

async function clickPill(page, id) {
  await page.click(`.lite-vp-btn[data-lite-planet="${id}"]`, { timeout: 5000 });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });

  /* ════════ Desktop 1440x900 — rest frame, idle drift, focus frames ════════ */
  {
    const { ctx, page, errors } = await bootPage(browser, { width: 1440, height: 900 });
    await sleep(700);
    await shot(page, 'craft-v576-00-boot700ms'); // crossfade evidence: poster, not a black hole
    const gl = await waitWebGL(page, 'desktop');

    if (gl) {
      // crossfade end-state: poster retired cleanly, no stuck handoff class
      await sleep(2600);
      const handoff = await page.evaluate(() => ({
        posterHidden: document.getElementById('orrery-lite-poster')?.getAttribute('aria-hidden') === 'true',
        stuck: document.getElementById('orrery-viewport')?.classList.contains('orrery-viewport--handoff'),
        canvasInline: document.getElementById('orrery-canvas')?.style.opacity || '',
        labelLayer: !!document.getElementById('orrery-dom-labels'),
      }));
      if (handoff.posterHidden && !handoff.stuck && handoff.canvasInline === '') ok('desktop: poster→HD handoff completed cleanly (poster retired, no stuck class/inline style)');
      else fail(`desktop: handoff end-state ${JSON.stringify(handoff)}`);
      if (handoff.labelLayer) ok('desktop: #orrery-dom-labels layer present in viewport');
      else fail('desktop: #orrery-dom-labels missing');

      // rest frame (dive fires at +1.1s; give it time to land)
      try {
        await page.waitForFunction(() => window.Orrery3D.getScaleLevel && window.Orrery3D.getScaleLevel() === 0, null, { timeout: 20000 });
        ok('desktop: auto-dive reached EARTH scale');
      } catch { fail('desktop: auto-dive never reached EARTH scale'); }
      await sleep(6000);
      await shot(page, 'craft-v576-01-rest');

      // 60s idle: drift must stay on the terminator
      await sleep(30000);
      await shot(page, 'craft-v576-02-idle30');
      await sleep(30000);
      await shot(page, 'craft-v576-03-idle60');
      const lvl = await page.evaluate(() => window.Orrery3D.getScaleLevel());
      if (lvl === 0) ok('desktop: still at EARTH scale after 60s idle');
      else fail(`desktop: scale drifted to ${lvl} after idle`);

      // MOON pill — Earth and Moon share the frame
      await clickPill(page, 'moon');
      await sleep(3000);
      await shot(page, 'craft-v576-04-moon');
      ok('desktop: MOON pill frame captured');

      // SATURN focus — textured ringed portrait
      await clickPill(page, 'saturn');
      await sleep(3000);
      await shot(page, 'craft-v576-05-saturn');
      // JUPITER focus
      await clickPill(page, 'jupiter');
      await sleep(3000);
      await shot(page, 'craft-v576-06-jupiter');
      ok('desktop: Saturn + Jupiter focus frames captured');

      // planet-name typography at SYSTEM scale
      await page.click('#ap-scale-strip .orrery-scale-btn[data-scale="2"]', { timeout: 5000 }).catch(() => {});
      await sleep(3200);
      const labels = await page.evaluate(() =>
        [...document.querySelectorAll('.orrery-dom-label')]
          .filter((el) => parseFloat(el.style.opacity || '0') > 0.1).length
      );
      if (labels >= 4) ok(`desktop: ${labels} planet-name labels visible at SYSTEM scale`);
      else fail(`desktop: only ${labels} labels visible at SYSTEM scale`);
      await shot(page, 'craft-v576-07-system-labels');

      // EARTH return — rest frame must be recoverable
      await clickPill(page, 'earth');
      await sleep(3500);
      const backLvl = await page.evaluate(() => window.Orrery3D.getScaleLevel());
      if (backLvl === 0) ok('desktop: EARTH pill returns to rest frame');
      else fail(`desktop: EARTH return landed at level ${backLvl}`);
      await shot(page, 'craft-v576-08-earth-return');
    }
    reportErrors('desktop', errors);
    await ctx.close();
  }

  /* ════════ Mobile 390x844 — rest frame ════════ */
  {
    const { ctx, page, errors } = await bootPage(browser, { width: 390, height: 844 });
    const gl = await waitWebGL(page, 'mobile');
    if (gl) {
      await sleep(9000);
      await shot(page, 'craft-v576-09-mobile-rest');
      await clickPill(page, 'moon').catch(() => {});
      await sleep(3000);
      await shot(page, 'craft-v576-10-mobile-moon');
      ok('mobile: rest + moon frames captured');
    }
    reportErrors('mobile', errors);
    await ctx.close();
  }

  /* ════════ PRM — reduced motion: engraved wheel fallback intact, no crash ════════ */
  {
    const { ctx, page, errors } = await bootPage(browser, { width: 1440, height: 900 }, { prm: true });
    await sleep(9000);
    const prm = await page.evaluate(() => {
      const wrap = document.getElementById('apAwardOrreryWrap');
      const wheel = document.getElementById('apHeroWheelFallback');
      const wheelVisible = wheel && getComputedStyle(wheel).display !== 'none' && wheel.getBoundingClientRect().height > 40;
      const wrapShown = wrap && !wrap.hidden && getComputedStyle(wrap).display !== 'none';
      return { wheelVisible, wrapShown, booted: !!window.__orreryReady };
    });
    if (prm.wheelVisible || prm.wrapShown) ok(`PRM: hero intact (wheel=${prm.wheelVisible} orrery=${prm.wrapShown} booted=${prm.booted})`);
    else fail('PRM: neither engraved wheel nor orrery visible');
    await shot(page, 'craft-v576-11-prm');
    reportErrors('PRM', errors);
    await ctx.close();
  }

  /* ════════ 2D fallback — WebGL engine blocked, canvas engine must carry ════════ */
  {
    const { ctx, page, errors } = await bootPage(browser, { width: 1440, height: 900 }, { blockEngine: true });
    try {
      await page.waitForFunction(
        () => window.__orreryReady && document.documentElement.classList.contains('orrery-canvas'),
        null, { timeout: 45000 }
      );
      ok('fallback2d: canvas engine booted (orrery-canvas class, __orreryReady)');
    } catch {
      fail('fallback2d: canvas engine did not boot after blocking orrery-webgl.js');
    }
    await sleep(4000);
    await shot(page, 'craft-v576-12-fallback2d');
    const crashed = errors.filter((e) => e.startsWith('pageerror:'));
    if (crashed.length === 0) ok('fallback2d: no uncaught page errors');
    else fail(`fallback2d: ${crashed.length} pageerrors — ${crashed.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }

  await browser.close();
  const fails = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n══ craft-v576 verify: ${results.length - fails}/${results.length} ok ══`);
  process.exit(fails ? 1 : 0);
}

main().catch((e) => { console.error('harness error:', e); process.exit(2); });
