import { chromium } from 'playwright';
const PAGES = ['','chart.html','horoscope.html','compatibility.html','transits.html','ephemeris.html','shop.html','tonight.html','this-weeks-sky.html','moonphase.html','retrograde.html','what-is-my-rising-sign.html','synastry.html','saturn-return.html','solar-return.html','lifepath.html','angel-numbers.html','name-numerology.html','cosmic-story.html','quiz.html','why.html','accuracy.html','charts.html','profile.html','links.html','privacy.html','terms.html','aries.html','sample-reading.html'];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' });
await ctx.addInitScript(() => Object.defineProperty(navigator,'webdriver',{get:()=>undefined}));
const bad = [];
for (const p of PAGES) {
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('JS: '+String(e).slice(0,110)));
  pg.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text().slice(0,110)); });
  pg.on('requestfailed', r => { const u=r.url(); if (/\.(css|js)(\?|$)/.test(u)) errs.push('failed-load: '+u.split('/').pop().slice(0,40)); });
  try {
    await pg.goto('http://localhost:8794/'+p, { waitUntil:'load', timeout:25000 });
    await pg.waitForTimeout(2200);
    const info = await pg.evaluate(() => {
      const bg = getComputedStyle(document.body).backgroundColor;
      const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
      const num = s => (s.match(/[\d.]+/g)||[]).map(Number);
      const m = num(bg), hm = num(htmlBg);
      const isLight = c => c.length>=3 && c[0]>200 && c[1]>200 && c[2]>200;
      const isTransp = c => (c.length===4 && c[3]===0) || c.length<3;
      const bi = getComputedStyle(document.body).backgroundImage;
      const hbi = getComputedStyle(document.documentElement).backgroundImage;
      const hasDarkImg = (bi && bi !== 'none') || (hbi && hbi !== 'none');
      // also treat a dark canvas backdrop (#starfield-canvas etc.) as non-white
      const hasCanvas = !!document.querySelector('canvas#starfield-canvas, canvas[aria-hidden]');
      const whiteish = !hasDarkImg && !hasCanvas && (isLight(m)||isTransp(m)) && (isLight(hm)||isTransp(hm));
      return { bodyBg: bg, htmlBg, bi: bi.slice(0,30), voidSet: !!getComputedStyle(document.documentElement).getPropertyValue('--void').trim(), whiteish };
    });
    if (info.whiteish || errs.length) bad.push(`/${p||'(home)'} [${info.whiteish?'WHITE!':'ok'}] bg=${info.bodyBg} void=${info.voidSet} ${errs.length?':: '+errs.join(' | '):''}`);
  } catch(e) { bad.push(`/${p||'(home)'} NAV-FAIL: ${String(e).slice(0,80)}`); }
  await pg.close();
}
console.log(bad.length ? bad.join('\n') : 'ALL '+PAGES.length+' PAGES OK — dark bg, no console errors');
await b.close();
