import { chromium } from 'playwright';

function gate(n, ok, d) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`);
  return ok;
}

const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl'],
});

async function go(path, w, h, m) {
  const ctx = await b.newContext({
    viewport: { width: w, height: h },
    isMobile: m,
    hasTouch: m,
    deviceScaleFactor: m ? 2 : 1,
  });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    try {
      localStorage.setItem('ap_intro_complete', '1');
    } catch (e) {}
  });
  await p.goto('http://127.0.0.1:8790' + path, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await p.waitForTimeout(path === '/' ? 4500 : 2500);
  const r = await p.evaluate(() => {
    const fab = document.getElementById('apFinderFab');
    const edu = document.querySelector('[aria-labelledby="edu-transits-heading"]');
    const grid = document.getElementById('current-sky');
    const cast = document.querySelector(
      '.hero-form button, #calculate-btn, #mom-freeze, .shop-hero .btn--primary'
    );
    const cr = cast?.getBoundingClientRect();
    return {
      bodyH: document.body.scrollHeight,
      vh: innerHeight,
      bottom: !!document.querySelector('.bottom-nav'),
      fab: !fab || getComputedStyle(fab).display === 'none',
      gridH: grid ? Math.round(grid.getBoundingClientRect().height) : null,
      edu: !edu || getComputedStyle(edu).display === 'none',
      castOk: cr ? cr.bottom <= innerHeight - 4 && cr.top >= 0 : null,
    };
  });
  await ctx.close();
  return r;
}

let all = true;
const hm = await go('/', 390, 844, true);
const tm = await go('/transits.html', 390, 844, true);
const td = await go('/transits.html', 1440, 900, false);
const em = await go('/ephemeris.html', 390, 844, true);
const cm = await go('/chart.html', 390, 844, true);
const mm = await go('/moment.html', 390, 844, true);

all = gate('home bottom-nav', hm.bottom, JSON.stringify(hm)) && all;
all = gate('home FAB off', hm.fab) && all;
all = gate('home cast ok', hm.castOk, JSON.stringify(hm)) && all;
all =
  gate(
    'transits mob ≤7000',
    tm.bodyH <= 7000,
    `bodyH=${tm.bodyH} grid=${tm.gridH}`
  ) && all;
all = gate('transits desk ≤5500', td.bodyH <= 5500, `bodyH=${td.bodyH}`) && all;
all = gate('transits edu hidden', tm.edu) && all;
all = gate('sky mob ≤5200', em.bodyH <= 5200, `bodyH=${em.bodyH}`) && all;
all = gate('chart cast ok', cm.castOk, `bodyH=${cm.bodyH}`) && all;
all = gate('moment freeze ok', mm.castOk, `bodyH=${mm.bodyH}`) && all;

const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:8790/');
await p.waitForTimeout(4000);
await p.screenshot({ path: 'out/structure-2026-07-10/home-mob-final.png' });
await p.goto('http://127.0.0.1:8790/transits.html');
await p.waitForTimeout(2000);
await p.screenshot({ path: 'out/structure-2026-07-10/transits-mob-final.png' });
await ctx.close();

console.log(all ? 'ALL GATES PASS' : 'SOME FAILED');
await b.close();
process.exit(all ? 0 : 1);
