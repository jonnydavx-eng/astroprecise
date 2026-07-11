import { chromium } from 'playwright';

function gate(n, ok, d) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`);
  return ok;
}

const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl'],
});

async function meas(path, w, h, mobile) {
  const ctx = await b.newContext({
    viewport: { width: w, height: h },
    isMobile: !!mobile,
    hasTouch: !!mobile,
    deviceScaleFactor: mobile ? 2 : 1,
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
  await p.waitForTimeout(path === '/' || path.includes('explore') ? 3500 : 2000);
  const m = await p.evaluate(() => {
    const fab = document.getElementById('apFinderFab');
    const bottom = document.querySelector('.bottom-nav');
    const edu = document.querySelector('[aria-labelledby="edu-transits-heading"]');
    const grid = document.getElementById('current-sky');
    const calc = document.querySelector(
      '#calculate-btn, #mom-freeze, .hero-form button, .shop-hero .btn--primary, .explore-return__primary'
    );
    const r = calc?.getBoundingClientRect();
    return {
      bodyH: document.body.scrollHeight,
      vh: innerHeight,
      fabHidden: !fab || getComputedStyle(fab).display === 'none',
      hasBottom: !!bottom,
      eduHidden: !edu || getComputedStyle(edu).display === 'none',
      gridH: grid ? Math.round(grid.getBoundingClientRect().height) : null,
      primaryOk: r ? r.bottom <= innerHeight - 4 && r.top >= 0 : null,
      overflowX:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 2,
    };
  });
  await ctx.close();
  return m;
}

let all = true;
const td = await meas('/transits.html', 1440, 900, false);
const tm = await meas('/transits.html', 390, 844, true);
const ed = await meas('/ephemeris.html', 1440, 900, false);
const em = await meas('/ephemeris.html', 390, 844, true);
const hm = await meas('/', 390, 844, true);
const cm = await meas('/chart.html', 390, 844, true);
const mm = await meas('/moment.html', 390, 844, true);
const sm = await meas('/shop.html', 390, 844, true);

all = gate('transits desk bodyH ≤5500', td.bodyH <= 5500, `bodyH=${td.bodyH} gridH=${td.gridH}`) && all;
all = gate('transits mob bodyH ≤7000', tm.bodyH <= 7000, `bodyH=${tm.bodyH} gridH=${tm.gridH}`) && all;
all = gate('transits edu hidden', td.eduHidden && tm.eduHidden) && all;
all = gate('sky desk bodyH ≤4800', ed.bodyH <= 4800, `bodyH=${ed.bodyH}`) && all;
all = gate('sky mob bodyH ≤5200', em.bodyH <= 5200, `bodyH=${em.bodyH}`) && all;
all = gate('home has bottom-nav', hm.hasBottom, JSON.stringify(hm)) && all;
all = gate('Tools FAB gone (home)', hm.fabHidden) && all;
all =
  gate(
    'chart/moment/shop primary still ok',
    cm.primaryOk && mm.primaryOk && sm.primaryOk,
    JSON.stringify({ c: cm.primaryOk, m: mm.primaryOk, s: sm.primaryOk })
  ) && all;

const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:8790/transits.html');
await p.waitForTimeout(2000);
await p.screenshot({ path: 'out/structure-2026-07-10/transits-mob-after.png' });
await p.goto('http://127.0.0.1:8790/');
await p.waitForTimeout(2500);
await p.screenshot({ path: 'out/structure-2026-07-10/home-mob-bottomnav.png' });
await ctx.close();

console.log(all ? 'ALL PHASE5 GATES PASS' : 'SOME FAILED');
await b.close();
process.exit(all ? 0 : 1);
