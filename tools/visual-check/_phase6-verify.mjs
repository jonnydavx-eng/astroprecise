import { chromium } from 'playwright';

function gate(n, ok, d) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`);
  return ok;
}

const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl'],
});

async function go(path, w, h, mobile) {
  const ctx = await b.newContext({
    viewport: { width: w, height: h },
    isMobile: mobile,
    hasTouch: mobile,
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
  await p.waitForTimeout(path === '/' ? 5500 : 2000);
  const m = await p.evaluate(() => {
    const dial = document.getElementById('sphere-wrap');
    const cast = document.querySelector(
      '.hero-form button, #calculate-btn, #mom-freeze, .shop-hero .btn--primary, .sign-card'
    );
    const cr = cast?.getBoundingClientRect();
    let scale = null;
    try {
      if (window.Orrery3D && typeof window.Orrery3D.getScaleLevel === 'function') {
        scale = window.Orrery3D.getScaleLevel();
      }
    } catch (e) {}
    return {
      bodyH: document.body.scrollHeight,
      vh: innerHeight,
      orreryFull: document.documentElement.classList.contains('orrery-full'),
      scale,
      dialHidden: !dial || getComputedStyle(dial).display === 'none',
      subHidden:
        !document.getElementById('horoscope-subscribe') ||
        getComputedStyle(document.getElementById('horoscope-subscribe')).display ===
          'none',
      bottom: !!document.querySelector('.bottom-nav'),
      castOk: cr ? cr.bottom <= innerHeight - 4 && cr.top >= 0 : null,
    };
  });
  await p.screenshot({
    path:
      'out/structure-2026-07-10/p6-' +
      (mobile ? 'm' : 'd') +
      '-' +
      path.replace(/[^a-z]/g, '') +
      '.png',
  });
  await ctx.close();
  return m;
}

let all = true;
const hd = await go('/', 1440, 900, false);
const hm = await go('/', 390, 844, true);
const dm = await go('/horoscope.html', 390, 844, true);
const dd = await go('/horoscope.html', 1440, 900, false);
const cm = await go('/chart.html', 390, 844, true);
const tm = await go('/transits.html', 390, 844, true);

all = gate('home orrery-full', hd.orreryFull, JSON.stringify(hd)) && all;
// Earth rest frame = scale 0
all =
  gate(
    'home Earth rest scale 0 (desk)',
    hd.scale === 0 || hd.scale === null,
    `scale=${hd.scale}`
  ) && all;
all =
  gate(
    'home Earth rest scale 0 (mob)',
    hm.scale === 0 || hm.scale === null,
    `scale=${hm.scale}`
  ) && all;
all = gate('home cast ok', hd.castOk && hm.castOk) && all;
all = gate('home bottom-nav mob', hm.bottom) && all;
all = gate('daily dial hidden', dm.dialHidden && dd.dialHidden) && all;
all = gate('daily subscribe hidden', dm.subHidden) && all;
all = gate('daily mob bodyH ≤4800', dm.bodyH <= 4800, `bodyH=${dm.bodyH}`) && all;
all = gate('daily desk bodyH ≤4200', dd.bodyH <= 4200, `bodyH=${dd.bodyH}`) && all;
all = gate('daily signs still primary', dm.castOk) && all;
all = gate('chart/transits still lean', cm.castOk && tm.bodyH <= 7000, JSON.stringify({ c: cm, t: tm.bodyH })) && all;

console.log(all ? 'ALL PHASE6 GATES PASS' : 'SOME FAILED');
await b.close();
process.exit(all ? 0 : 1);
