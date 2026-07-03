// Functional smoke — exercises real user flows and reports per-flow pass/fail + console errors.
import { chromium } from 'playwright';
const BASE = 'http://localhost:8794';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' });
await ctx.addInitScript(() => Object.defineProperty(navigator,'webdriver',{get:()=>undefined}));
const results = [];
function rec(flow, pass, detail, errs) { results.push({ flow, pass, detail, errs: (errs||[]).filter(e=>!/noaa|swpc|ovation/i.test(e)) }); }

async function newPage(collectErrs=true) {
  const pg = await ctx.newPage();
  const errs = [];
  if (collectErrs) {
    pg.on('pageerror', e => errs.push('JS:'+String(e).slice(0,90)));
    pg.on('console', m => { if (m.type()==='error') errs.push('con:'+m.text().slice(0,90)); });
  }
  pg._errs = errs;
  return pg;
}

// 1. HOMEPAGE — dark bg + dateline + hero form nav
try {
  const pg = await newPage();
  await pg.goto(BASE+'/?fresh='+Date.now(), { waitUntil:'load', timeout:25000 });
  await pg.waitForTimeout(2500);
  const info = await pg.evaluate(() => ({
    bg: getComputedStyle(document.documentElement).backgroundColor,
    voidSet: !!getComputedStyle(document.documentElement).getPropertyValue('--void').trim(),
    dateline: (document.getElementById('dateline-sun')||{}).textContent||'',
    nav: document.querySelectorAll('.navbar__nav a, nav a[href$=".html"]').length,
    hasForm: !!document.getElementById('hero-chart-form'),
  }));
  const dark = /rgb\(12, 16, 22\)|rgb\(12,16,22\)/.test(info.bg);
  rec('home:render', dark && info.voidSet, `bg=${info.bg} void=${info.voidSet} dateline="${info.dateline}" nav=${info.nav}`, pg._errs);
  // hero form: valid date navigates to chart
  await pg.fill('#hero-birthdate','1990-06-14').catch(()=>{});
  await pg.click('#hero-chart-form button[type=submit]').catch(()=>{});
  await pg.waitForTimeout(1200);
  rec('home:hero-form→chart', /chart\.html/.test(pg.url()), `url=${pg.url().split('/').pop()}`, []);
  await pg.close();
} catch(e){ rec('home','FAIL',String(e).slice(0,100)); }

// 2. CHART — the core product: compute + wheel + tabs
try {
  const pg = await newPage();
  await pg.goto(BASE+'/chart.html?fresh='+Date.now(), { waitUntil:'load', timeout:25000 });
  await pg.waitForTimeout(2500);
  // fill the form via JS (robust to field ids) then submit
  const filled = await pg.evaluate(() => {
    const set = (sel,v)=>{ const el=document.querySelector(sel); if(el){el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true;} return false; };
    const d = set('#birth-date, input[type=date], #bdate', '1990-06-14');
    const t = set('#birth-time, input[type=time], #btime', '02:42');
    return { d, t };
  });
  // try clicking a Calculate button
  await pg.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>/calculate|cast|generate/i.test(x.textContent)); if(b) b.click(); });
  await pg.waitForTimeout(3500);
  const chartInfo = await pg.evaluate(() => ({
    wheel: !!document.querySelector('svg.chart-wheel, #chart-wheel svg, .natal-wheel svg, [class*=wheel] svg'),
    resultVisible: !!document.querySelector('#result-name, .chart-result, #chart-results, [class*=result]'),
    planetsText: (document.body.innerText.match(/Sun|Moon|Rising|Ascendant/g)||[]).length,
    tabs: document.querySelectorAll('[role=tab], .chart-tab, .tab-btn').length,
  }));
  rec('chart:compute', chartInfo.planetsText>2, `wheel=${chartInfo.wheel} result=${chartInfo.resultVisible} planetWords=${chartInfo.planetsText} tabs=${chartInfo.tabs}`, pg._errs);
  await pg.close();
} catch(e){ rec('chart','FAIL',String(e).slice(0,100)); }

// 3. HOROSCOPE — pick sign → reading opens; pills have seals
try {
  const pg = await newPage();
  await pg.goto(BASE+'/horoscope.html?fresh='+Date.now(), { waitUntil:'load', timeout:25000 });
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => { const c=document.querySelector('[data-sign=leo], .sign-card[data-sign], .home-sign-card, button[data-sign]'); if(c) c.click(); });
  await pg.waitForTimeout(2500);
  const h = await pg.evaluate(() => ({
    readingText: (document.querySelector('#reading, .horoscope-reading, [class*=reading]')||{}).innerText||'',
    pillSeals: document.querySelectorAll('.planet-pill .ap-seal').length,
    pills: document.querySelectorAll('.planet-pill').length,
  }));
  rec('horoscope:reading+seals', h.readingText.length>40 && h.pillSeals>=5, `readingLen=${h.readingText.length} pillSeals=${h.pillSeals}/${h.pills}`, pg._errs);
  await pg.close();
} catch(e){ rec('horoscope','FAIL',String(e).slice(0,100)); }

// 4. TRANSITS — ticker seals + planet grid
try {
  const pg = await newPage();
  await pg.goto(BASE+'/transits.html?fresh='+Date.now(), { waitUntil:'load', timeout:25000 });
  await pg.waitForTimeout(6000);
  const t = await pg.evaluate(() => ({
    tickerSeals: document.querySelectorAll('#transit-ticker-track .ap-seal').length,
    grid: document.querySelectorAll('#current-sky .planet-card, .planet-grid .planet-card').length,
    gridText: (document.body.innerText.match(/Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces/g)||[]).length,
  }));
  rec('transits:ticker+grid', t.tickerSeals>=10 && t.gridText>3, `tickerSeals=${t.tickerSeals} grid=${t.grid} signWords=${t.gridText}`, pg._errs);
  await pg.close();
} catch(e){ rec('transits','FAIL',String(e).slice(0,100)); }

// 5. THIS WEEK'S SKY — events render
try {
  const pg = await newPage();
  await pg.goto(BASE+'/this-weeks-sky.html?fresh='+Date.now(), { waitUntil:'load', timeout:25000 });
  await pg.waitForTimeout(3000);
  const w = await pg.evaluate(() => ({ events: document.querySelectorAll('.wk-event').length, moon: document.querySelectorAll('.wk-moonstrip__chip').length }));
  rec('this-weeks-sky:events', w.events>=1, `events=${w.events} moonChips=${w.moon}`, pg._errs);
  await pg.close();
} catch(e){ rec('this-weeks-sky','FAIL',String(e).slice(0,100)); }

// 6. COMPATIBILITY — run synastry (auto from params if supported)
try {
  const pg = await newPage();
  await pg.goto(BASE+'/compatibility.html?fresh='+Date.now(), { waitUntil:'load', timeout:25000 });
  await pg.waitForTimeout(2500);
  const c = await pg.evaluate(() => ({
    forms: document.querySelectorAll('form, .compat-form').length,
    hasInputs: document.querySelectorAll('input[type=date], input[type=time]').length,
  }));
  rec('compatibility:loads', c.forms>0 && c.hasInputs>0, `forms=${c.forms} dateTimeInputs=${c.hasInputs}`, pg._errs);
  await pg.close();
} catch(e){ rec('compatibility','FAIL',String(e).slice(0,100)); }

// 7. SHOP — dormant-honest state + cart refuses dormant + PayPal follow-up when a link is set
try {
  const pg = await newPage();
  await pg.goto(BASE+'/shop.html?fresh='+Date.now(), { waitUntil:'load', timeout:25000 });
  await pg.waitForTimeout(2500);
  const dormant = await pg.evaluate(() => {
    const title = (document.querySelector('.shop-section-title')||{}).innerText||'';
    return { dormantCopy: /opening soon/i.test(title), title };
  });
  rec('shop:dormant-honest', dormant.dormantCopy, `sectionTitle="${dormant.title.slice(0,50)}"`, pg._errs);
  // simulate a live PayPal SKU → checkout opens PayPal + shows details follow-up
  const flow = await pg.evaluate(async () => {
    const p = AP_MON.commerce.products.find(x=>x.id==='deep-reading');
    p.fulfilUrl = 'https://www.paypal.com/ncp/payment/TEST123';
    let opened=null; const o=window.open; window.open=(u)=>{opened=u;return null;};
    AstroShop.addToCart('deep-reading'); AstroShop.cart.checkoutNow(); window.open=o;
    await new Promise(r=>setTimeout(r,700));
    const m=document.getElementById('shopc-modal');
    return { opened, modalTitle:(m&&m.querySelector('.shopc-modal__title').textContent)||'', action:(m&&m.querySelector('.shopc-modal__actions a')&&m.querySelector('.shopc-modal__actions a').getAttribute('href'))||'', ls: /lemonsqueezy/i.test(document.documentElement.outerHTML) };
  });
  const payok = /paypal\.com/.test(flow.opened||'') && /fulfil-redirect/.test(flow.action) && !flow.ls;
  rec('shop:paypal-checkout+details', payok, `opened=${(flow.opened||'').slice(0,40)} follow="${flow.modalTitle}" action=${(flow.action||'').slice(0,40)} LSpresent=${flow.ls}`, pg._errs);
  await pg.close();
} catch(e){ rec('shop','FAIL',String(e).slice(0,120)); }

// 8. TOOLS — moonphase + lifepath compute
for (const [name, url, expr] of [
  ['moonphase','/moonphase.html', () => (document.body.innerText.match(/%|illuminat|waxing|waning|new moon|full moon|quarter/gi)||[]).length>0],
  ['lifepath','/lifepath.html', () => document.querySelectorAll('input, button').length>0],
]) {
  try {
    const pg = await newPage();
    await pg.goto(BASE+url+'?fresh='+Date.now(), { waitUntil:'load', timeout:25000 });
    await pg.waitForTimeout(2500);
    const ok = await pg.evaluate(expr);
    rec('tool:'+name, ok, `loaded, errs=${pg._errs.length}`, pg._errs);
    await pg.close();
  } catch(e){ rec('tool:'+name,'FAIL',String(e).slice(0,100)); }
}

await b.close();
// report
let fails=0, errPages=0;
for (const r of results) {
  const status = r.pass===true ? 'PASS' : (r.pass==='FAIL' ? 'FAIL' : 'FAIL');
  if (r.pass!==true) fails++;
  if (r.errs && r.errs.length) errPages++;
  console.log(`${r.pass===true?'✓':'✗'} ${r.flow}  ${r.detail}${r.errs&&r.errs.length?'  ⚠ERRORS: '+r.errs.join(' | '):''}`);
}
console.log(`\n${results.length-fails}/${results.length} flows passed; ${errPages} page(s) had non-NOAA console errors.`);
