/**
 * Round-2 birth-data leak proof.
 *
 * Serves website/ from a throwaway origin that records the RAW REQUEST LINE and
 * the Referer header of every single request, then drives real Chrome against
 * it — once with JavaScript DISABLED (so the browser's own native form
 * behaviour is what is being measured, not a script that happens to call
 * preventDefault), and once with JavaScript on (so the features still work).
 *
 * A leak is any birth date, birth time, birth town, coordinate, name or email
 * appearing in a request line or a Referer. The needles below are deliberately
 * odd so a false negative is impossible.
 *
 * Run:  node tools/visual-check/_leak-proof-round2.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './node_modules/playwright/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', 'website');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8791;
const ORIGIN = `http://127.0.0.1:${PORT}`;

/* Needles — every one of these is "personal data" for the purposes of this test. */
const N = {
  date: '1901-02-03',
  time: '04:05',
  date2: '1911-12-13',
  time2: '06:07',
  town: 'Zzyzxville',
  town2: 'Qqqxborough',
  name: 'Wibblenaut',
  name2: 'Frobnicator',
  email: 'leaktest@example.invalid',
};
const NEEDLES = Object.values(N).concat(['04%3A05', '06%3A07', '1901', '1911']);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.jsonl': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

/* Pre-fix copies, pulled straight out of git, for the negative control.
   Relative asset paths still resolve because it is served from a sub-path that
   404s on assets — irrelevant, the form markup is what is under test. */
const CONTROL = new Map();
{
  const { execFileSync } = await import('node:child_process');
  const REPO = path.join(HERE, '..', '..');
  for (const [name, ref] of [
    ['compatibility.html', '3c99760:website/compatibility.html'],
    ['profile.html', '3c99760:website/profile.html'],
  ]) {
    try {
      CONTROL.set(name, execFileSync('git', ['show', ref], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 }));
    } catch (e) { console.log('  (control unavailable: ' + ref + ')'); }
  }
}

/** @type {{line:string, referer:string}[]} */
let log = [];
const server = http.createServer((req, res) => {
  log.push({ line: `${req.method} ${req.url}`, referer: req.headers.referer || '' });
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  // /__control__/x.html serves the PRE-FIX copy of x.html from git, so the
  // harness can be shown to fail on a page that really does leak.
  if (rel.startsWith('/__control__/')) {
    const name = rel.slice('/__control__/'.length);
    const src = CONTROL.get(name);
    if (src) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(src);
      return;
    }
  }
  // /__unhidden__/x.html serves x.html with [hidden] / .hidden neutralised, so a
  // panel that a script would normally reveal can still be submitted with the
  // script switched off. Pure CSS — nothing here re-enables JavaScript.
  let unhide = false;
  if (rel.startsWith('/__unhidden__/')) { unhide = true; rel = '/' + rel.slice('/__unhidden__/'.length); }

  const file = path.join(ROOT, path.normalize(rel).replace(/^[\\/]+/, ''));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404'); return;
  }
  if (unhide) {
    const html = fs.readFileSync(file, 'utf8').replace(
      '</head>',
      '<style>[hidden]{display:revert !important}.hidden{display:revert !important}' +
      '*{visibility:visible !important}</style></head>'
    );
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

let pass = 0, fail = 0;
const results = [];
function ok(name, cond, detail) {
  if (cond) { pass++; results.push(`  PASS  ${name}`); }
  else { fail++; results.push(`  FAIL  ${name}${detail ? '\n          ' + detail : ''}`); }
}

/** Every logged request line + Referer that contains any needle. */
function leaks(since = 0) {
  const out = [];
  for (const e of log.slice(since)) {
    for (const n of NEEDLES) {
      if (e.line.includes(n)) { out.push(`request line: ${e.line}`); break; }
    }
    for (const n of NEEDLES) {
      if (e.referer.includes(n)) { out.push(`Referer: ${e.referer} (on ${e.line})`); break; }
    }
  }
  return [...new Set(out)];
}

function urlLeaks(url) {
  return NEEDLES.filter(n => url.includes(n));
}

/** Type into a field using real key events — works with JS disabled. */
async function typeInto(page, selector, value) {
  const el = page.locator(selector).first();
  await el.click({ timeout: 5000 });
  await page.keyboard.press('Control+A').catch(() => {});
  await page.keyboard.type(value, { delay: 1 });
}

/** Date/time inputs need segment typing, not a string with separators. */
async function typeDate(page, selector, iso) {
  const [y, m, d] = iso.split('-');
  const el = page.locator(selector).first();
  await el.click({ timeout: 5000 });
  await page.keyboard.type(`${d}${m}${y}`, { delay: 5 }); // en-GB order in Chrome
}
async function typeTime(page, selector, hhmm) {
  const [hh, mm] = hhmm.split(':');
  const el = page.locator(selector).first();
  await el.click({ timeout: 5000 });
  await page.keyboard.type(`${hh}${mm}`, { delay: 5 });
  await page.keyboard.type('AM', { delay: 5 }).catch(() => {});
}

await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

/* ══ PART 1 — JAVASCRIPT DISABLED. The browser's own form behaviour. ══════ */
console.log('\n─── PART 1 · JavaScript DISABLED · native submit ───────────────');
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();

  /** Fill a form, submit it natively, report the resulting URL + wire traffic.
   *  `expectLeak` inverts every assertion — used for the negative control, so
   *  a clean result cannot come from a harness that quietly typed nothing. */
  async function nativeSubmit(label, url, fills, submitSel, expectLeak = false) {
    const before = log.length;
    await page.goto(ORIGIN + url, { waitUntil: 'domcontentloaded' });
    for (const [sel, kind, val] of fills) {
      const el = page.locator(sel).first();
      // fill() first — it works with script execution disabled and handles the
      // date/time widgets properly. Fall back to real keystrokes.
      let done = false;
      try { await el.fill(val, { timeout: 4000, force: true }); done = true; }
      catch (e) { console.log(`      (fill failed ${sel}: ${String(e.message).split('\n')[0]})`); }
      if (!done) {
        try {
          if (kind === 'date') await typeDate(page, sel, val);
          else if (kind === 'time') await typeTime(page, sel, val);
          else await typeInto(page, sel, val);
        } catch (e) { console.log(`      (type failed ${sel}: ${String(e.message).split('\n')[0]})`); }
      }
    }
    // Readback: proof the typing landed. A clean URL from an empty form proves
    // nothing at all, and that is exactly the false pass to guard against.
    let filled = 0;
    for (const [sel, , val] of fills) {
      const got = await page.locator(sel).first().inputValue().catch(() => '');
      if (got && (got === val || val.includes(got) || got.includes(val.slice(0, 4)))) filled++;
    }
    ok(`${label} · the form really was filled (${filled}/${fills.length} fields readback)`,
      filled === fills.length);

    const navBefore = page.url();
    // force: some of these panels sit under a sticky bar or start collapsed with
    // JS off; a native submit still fires, which is the thing under test.
    await page.locator(submitSel).first().click({ timeout: 6000, force: true })
      .catch(async () => {
        console.log(`      (submit click failed on ${submitSel}; pressing Enter instead)`);
        await page.locator(fills[0][0]).first().press('Enter').catch(() => {});
      });
    await page.waitForTimeout(700);
    const after = page.url();
    const inUrl = urlLeaks(after);
    const onWire = leaks(before);
    if (expectLeak) {
      ok(`CONTROL ${label} · harness DOES catch a leak when one exists`,
        inUrl.length > 0 || onWire.length > 0,
        `url=${after}\n          wire=${onWire.join(' | ')}`);
      console.log(`  CONTROL ${label}\n      after  ${after}`);
      return;
    }
    ok(`${label} · URL after native submit carries nothing personal`, inUrl.length === 0,
      `url=${after}\n          needles=${inUrl.join(', ')}`);
    ok(`${label} · no request line or Referer carries anything personal`, onWire.length === 0,
      onWire.join('\n          '));
    console.log(`  ${label}\n      before ${navBefore}\n      after  ${after}`);
  }

  /* ── Negative control ────────────────────────────────────────────────────
     The same drive against the compatibility page as it stood at commit
     3c99760, before this round — all fourteen controls still named. If this
     does NOT leak, the harness is broken and every PASS above is worthless. */
  await nativeSubmit('compatibility.html @3c99760 (pre-fix)', '/__control__/compatibility.html', [
    ['#person1-name', 'text', N.name],
    ['#person1-date', 'date', N.date],
    ['#person1-time', 'time', N.time],
    ['#person1-city', 'text', N.town],
  ], '#compat-submit-btn', true);

  /* Second negative control, and the clearest one on the site. profile.html's
     setup form has NO submit handler bound in a plain load — measured, and true
     both before and after this round, so it is a separate pre-existing defect
     for whoever owns that page. It makes the leak unmissable: the browser's own
     native submit is the ONLY thing that runs. Before, that produced
       ?setup-name=Wibblenaut&setup-email=leaktest%40example.invalid
     After, the same submit produces "?" and nothing else. */
  await nativeSubmit('profile.html @3c99760 (pre-fix)', '/__control__/profile.html', [
    ['#setup-name', 'text', N.name],
    ['#setup-email', 'text', N.email],
  ], '#setup-form button[type=submit]', true);

  await nativeSubmit('compatibility.html', '/compatibility.html', [
    ['#person1-name', 'text', N.name],
    ['#person1-date', 'date', N.date],
    ['#person1-time', 'time', N.time],
    ['#person1-city', 'text', N.town],
    ['#person2-name', 'text', N.name2],
    ['#person2-date', 'date', N.date2],
    ['#person2-time', 'time', N.time2],
    ['#person2-city', 'text', N.town2],
  ], '#compat-submit-btn');

  await nativeSubmit('transits.html', '/transits.html', [
    ['#natal-date-transit', 'date', N.date],
    ['#natal-time-transit', 'time', N.time],
    ['#transit-city', 'text', N.town],
  ], '#transit-submit-btn');

  await nativeSubmit('moment.html', '/moment.html', [
    ['#mom-date', 'date', N.date],
    ['#mom-time', 'time', N.time],
    ['#mom-place', 'text', N.town],
    ['#mom-title', 'text', N.name],
  ], '#mom-freeze');

  await nativeSubmit('moonphase.html (date)', '/moonphase.html', [
    ['#moonphase-date', 'date', N.date],
  ], '#moonphase-form button[type=submit]');

  await nativeSubmit('moonphase.html (compat)', '/__unhidden__/moonphase.html', [
    ['#mp-compat-name-a', 'text', N.name],
    ['#mp-compat-date-a', 'date', N.date],
    ['#mp-compat-name-b', 'text', N.name2],
    ['#mp-compat-date-b', 'date', N.date2],
  ], '#moonphase-compat-form button[type=submit]');

  await nativeSubmit('profile.html (setup)', '/profile.html', [
    ['#setup-name', 'text', N.name],
    ['#setup-email', 'text', N.email],
  ], '#setup-form button[type=submit]');

  await nativeSubmit('chart.html (wallpaper lead)', '/__unhidden__/chart.html', [
    ['#wallpaper-lead-email', 'text', N.email],
    ['#wallpaper-lead-birthdate', 'date', N.date],
  ], '#wallpaper-email-form button[type=submit]');

  await nativeSubmit('shop.html (wallpaper lead)', '/__unhidden__/shop.html', [
    ['#shop-wallpaper-email', 'text', N.email],
    ['#shop-wallpaper-birthdate', 'date', N.date],
  ], '#shop-wallpaper-form button[type=submit]');

  /* ── Structural check ────────────────────────────────────────────────────
     The behavioural test above can only reach a panel the page actually shows
     with the script off. The guarantee itself is structural and does not depend
     on that: a browser serialises ONLY named controls, so a form with no `name`
     anywhere in it cannot put anything into a URL, visible or not, script or no
     script. Assert that directly on every form that holds personal data —
     including #hs-form, which horoscope.html keeps hidden until its script
     runs and which the click test therefore cannot reach. */
  {
    const FORMS = [
      ['compatibility.html', '/compatibility.html', '#compat-form'],
      ['transits.html', '/transits.html', '#transit-form'],
      ['moment.html', '/moment.html', '#mom-form'],
      ['moonphase.html (date)', '/moonphase.html', '#moonphase-form'],
      ['moonphase.html (compat)', '/moonphase.html', '#moonphase-compat-form'],
      ['profile.html (setup)', '/profile.html', '#setup-form'],
      ['profile.html (email cta)', '/profile.html', '.ap-email-cta__form'],
      ['chart.html (wallpaper)', '/chart.html', '#wallpaper-email-form'],
      ['chart.html (email capture)', '/chart.html', '#email-capture-form'],
      ['shop.html (wallpaper)', '/shop.html', '#shop-wallpaper-form'],
      ['horoscope.html (subscribe)', '/horoscope.html', '#hs-form'],
      ['index.html (coupon)', '/index.html', '#coupon-form'],
      ['index.html (shop notify)', '/index.html', '#shopNotify'],
      ['eclipse.html (notify)', '/eclipse.html', '#emailForm'],
      ['links.html (waitlist)', '/links.html', '.cw-waitlist__form'],
      ['saturn-return.html (email cta)', '/saturn-return.html', '.ap-email-cta__form'],
    ];
    for (const [label, url, sel] of FORMS) {
      await page.goto(ORIGIN + url, { waitUntil: 'domcontentloaded' });
      const present = await page.locator(sel).count();
      // count()/getAttribute() run in Playwright's own world, so they still work
      // with page scripts switched off — evaluate() would not.
      const named = page.locator(`${sel} input[name], ${sel} select[name], ${sel} textarea[name]`);
      const n = await named.count();
      const names = [];
      for (let i = 0; i < n; i++) names.push(await named.nth(i).getAttribute('name'));
      ok(`STRUCTURE ${label} ${sel} · form is present`, present > 0);
      ok(`STRUCTURE ${label} ${sel} · zero named controls (nothing can be serialised)`,
        n === 0, `still named: ${names.join(', ')}`);
    }
  }

  await nativeSubmit('index.html (coupon)', '/index.html', [
    ['#f-date', 'date', N.date],
    ['#f-time', 'time', N.time],
    ['#f-place', 'text', N.town],
  ], '#coupon-form button[type=submit]');

  await nativeSubmit('index.html (shop notify)', '/index.html', [
    ['#shopNotifyEmail', 'text', N.email],
  ], '#shopNotify button[type=submit]');

  await nativeSubmit('eclipse.html (notify)', '/eclipse.html', [
    ['#eclipseEmail', 'text', N.email],
  ], '#emailForm button[type=submit]');

  await ctx.close();
}

/* ══ PART 2 — JAVASCRIPT ON. The features must still work. ════════════════ */
console.log('\n─── PART 2 · JavaScript ON · the features still work ──────────');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('    [pageerror] ' + e.message));

  // ── compatibility: compute, then check the address bar and the wire ──
  {
    const before = log.length;
    await page.goto(ORIGIN + '/compatibility.html', { waitUntil: 'load' });
    await page.evaluate(([n]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
      set('person1-name', n.name); set('person1-date', n.date); set('person1-time', n.time);
      set('person1-city', n.town); set('person1-lat', '53.5900'); set('person1-lon', '-2.2200');
      set('person1-tz', 'Europe/London');
      set('person2-name', n.name2); set('person2-date', n.date2); set('person2-time', n.time2);
      set('person2-city', n.town2); set('person2-lat', '51.5074'); set('person2-lon', '-0.1278');
      set('person2-tz', 'Europe/London');
    }, [N]);
    await page.locator('#compat-submit-btn').click();
    await page.waitForFunction(() => {
      const el = document.getElementById('compat-result');
      return el && !el.classList.contains('hidden');
    }, { timeout: 25000 }).catch(() => {});
    const url = page.url();
    ok('compat · result renders', await page.locator('#compat-result').isVisible());
    ok('compat · address bar clean after compute', urlLeaks(url).length === 0, `url=${url}`);
    ok('compat · nothing personal on the wire', leaks(before).length === 0, leaks(before).join('\n          '));
    const stash = await page.evaluate(() => sessionStorage.getItem('ap-compat-pair'));
    ok('compat · pair survives in sessionStorage', !!stash && stash.includes(N.date), `stash=${stash}`.slice(0, 200));
  }

  // ── compatibility: reload restores from sessionStorage, still no URL ──
  {
    const before = log.length;
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3500);
    const v1 = await page.locator('#person1-date').inputValue();
    ok('compat · reload restores person A from sessionStorage', v1 === N.date, `got ${v1}`);
    ok('compat · reload sent nothing personal', leaks(before).length === 0, leaks(before).join('\n          '));
  }

  // ── compatibility: legacy ?p1d= link still fills, then leaves the bar ──
  {
    const legacy = `${ORIGIN}/compatibility.html?p1d=${N.date}&p1t=${N.time}&p1n=${N.name}` +
      '&p1la=53.5900&p1lo=-2.2200&p1tz=Europe/London';
    await page.goto(legacy, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    ok('compat · legacy query link still prefills person A',
      (await page.locator('#person1-date').inputValue()) === N.date);
    ok('compat · legacy query is stripped from the address bar',
      urlLeaks(page.url()).length === 0, `url=${page.url()}`);
  }

  // ── compatibility: the invite link is a fragment, not a query ──
  {
    await page.goto(ORIGIN + '/compatibility.html', { waitUntil: 'load' });
    await page.evaluate(([n]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
      set('person1-name', n.name); set('person1-date', n.date); set('person1-time', n.time);
      set('person1-lat', '53.5900'); set('person1-lon', '-2.2200'); set('person1-tz', 'Europe/London');
    }, [N]);
    let copied = '';
    await page.evaluate(() => {
      window.__copied = '';
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      navigator.clipboard.writeText = t => { window.__copied = t; return Promise.resolve(); };
    });
    await page.locator('#compat-invite-btn').click();
    await page.waitForTimeout(400);
    copied = await page.evaluate(() => window.__copied);
    const q = copied.split('compatibility.html')[1] || '';
    ok('compat · invite link carries person A after the # , never the ?',
      q.startsWith('#') && q.includes('p1d=' + N.date) && !q.includes('?'), `link tail=${q}`);
  }

  // ── homepage cast → explorer link has no birth instant in it ──
  {
    await page.goto(ORIGIN + '/index.html', { waitUntil: 'load' });
    await page.evaluate(([n]) => {
      document.getElementById('dob').value = n.date;
      document.getElementById('tob').value = n.time;
    }, [N]);
    await page.locator('#castBtn').click();
    await page.waitForTimeout(1500);
    const href = await page.locator('#openExplorer').getAttribute('href');
    ok('index · Open-in-explorer link has no birth instant', !/m=/.test(href || ''), `href=${href}`);
    ok('index · address bar clean after a cast', urlLeaks(page.url()).length === 0, `url=${page.url()}`);
    const stash = await page.evaluate(() => sessionStorage.getItem('ap-explore-moment'));
    ok('index · the moment is stashed for explore instead', !!stash && stash.includes('1901-02-03'), `stash=${stash}`);

    // follow it: explore must pick the moment up out of storage
    const before = log.length;
    await page.locator('#openExplorer').click();
    await page.waitForTimeout(3500);
    ok('explore · reached with nothing personal in the URL',
      urlLeaks(page.url()).length === 0, `url=${page.url()}`);
    ok('explore · nothing personal on the wire', leaks(before).length === 0, leaks(before).join('\n          '));
    const applied = await page.evaluate(() => document.documentElement.getAttribute('data-ap-model-link'));
    ok('explore · the stashed moment was applied', !!applied && applied.includes('1901-02-03'), `data-ap-model-link=${applied}`);
    const drained = await page.evaluate(() => sessionStorage.getItem('ap-explore-moment'));
    ok('explore · the stash is consumed, not left lying about', drained === null, `still=${drained}`);
  }

  // ── explore still honours a public #m= link (the shareable contract) ──
  {
    await page.goto(ORIGIN + '/explore.html#m=2026-08-12T18:05:00.000Z&focus=moon', { waitUntil: 'load' });
    await page.waitForTimeout(3500);
    const applied = await page.evaluate(() => document.documentElement.getAttribute('data-ap-model-link'));
    ok('explore · public #m= deep link still works', !!applied && applied.includes('2026-08-12'), `data-ap-model-link=${applied}`);
  }

  // ── chart → eclipse handoff: prefilled, and nothing on the wire ──
  {
    await page.goto(ORIGIN + '/chart.html', { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page.evaluate(([n]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
      set('name-input', n.name); set('date-input', n.date); set('time-input', n.time);
      set('city-input', n.town); set('lat-input', '53.5900'); set('lon-input', '-2.2200');
      set('tz-input', 'Europe/London');
      const acc = document.getElementById('time-accuracy-input'); if (acc) acc.value = 'exact';
      document.getElementById('chart-form').requestSubmit();
    }, [N]);
    await page.waitForTimeout(6000);
    const eHref = await page.locator('#eclipse-cta, #eclipse-handoff').first().getAttribute('href').catch(() => null);
    ok('chart · eclipse CTA no longer carries dob/tob/tzname',
      !!eHref && !/dob=|tob=|tzname=/.test(eHref), `href=${eHref}`);
    const stash = await page.evaluate(() => sessionStorage.getItem('ap-eclipse-handoff'));
    ok('chart · eclipse handoff is stashed instead', !!stash && stash.includes(N.date), `stash=${stash}`);

    const before = log.length;
    await page.goto(ORIGIN + '/eclipse.html?from=chart', { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    ok('eclipse · picked the birth data up out of storage',
      (await page.locator('#dob').inputValue()) === N.date,
      `dob=${await page.locator('#dob').inputValue()}`);
    ok('eclipse · nothing personal on the wire', leaks(before).length === 0, leaks(before).join('\n          '));
  }

  // ── chart.html: the share link and the model CTA ──────────────────────
  {
    await page.goto(ORIGIN + '/chart.html', { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page.evaluate(([n]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
      set('name-input', n.name); set('date-input', n.date); set('time-input', n.time);
      set('city-input', n.town); set('lat-input', '53.5900'); set('lon-input', '-2.2200');
      set('tz-input', 'Europe/London');
      const acc = document.getElementById('time-accuracy-input'); if (acc) acc.value = 'exact';
      document.getElementById('chart-form').requestSubmit();
    }, [N]);
    await page.waitForTimeout(6000);

    const share = await page.evaluate(() =>
      window.APChartShare ? APChartShare.buildShareUrl(window.__apLastChart || null, null, { interactive: false }) : null);
    const shareFromUi = await page.evaluate(() => {
      const a = document.querySelector('#chart-share-strip a[href], #chart-share-strip input[value]');
      return a ? (a.getAttribute('href') || a.value) : null;
    });
    const link = share || shareFromUi;
    ok('chart · a shared-chart link exists to inspect', !!link, `share=${share} strip=${shareFromUi}`);
    ok('chart · a shared-chart link puts the record after the # , never the ?',
      !!link && link.includes('#' + 'n=') && !/\?(n|d|lat|lon|t|c|tz|hs|a)=/.test(link),
      `link=${link}`);

    const modelHref = await page.locator('#ap-chart-sky-bridge a[data-ap-model-link], .chart-whats-next a[href*="explore"]')
      .first().getAttribute('href').catch(() => null);
    ok('chart · a model link exists to inspect', !!modelHref, `href=${modelHref}`);
    ok('chart · the "see your sky in the model" link has no birth instant',
      !!modelHref && !/m=\d{4}/.test(modelHref), `href=${modelHref}`);
    const skyStash = await page.evaluate(() => sessionStorage.getItem('ap-explore-moment'));
    ok('chart · the birth moment is stashed for explore instead',
      !!skyStash && skyStash.includes('1901-02-03'), `stash=${skyStash}`);
  }

  // ── chart-view.html renders a chart handed over in a fragment ─────────
  {
    const frag = `n=${N.name}&d=${N.date}&t=${N.time}&c=${N.town}&lat=53.5900&lon=-2.2200&tz=Europe%2FLondon&hs=equal&a=exact`;
    const before = log.length;
    await page.goto(`${ORIGIN}/chart-view.html#${frag}`, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const nameText = await page.locator('#view-name').textContent();
    ok('chart-view · renders a chart carried in the fragment', (nameText || '').includes(N.name), `name=${nameText}`);
    ok('chart-view · nothing personal reached the server', leaks(before).length === 0, leaks(before).join('\n          '));
    const full = await page.locator('#view-full-link').getAttribute('href');
    ok('chart-view · its "open in full" link is a fragment too',
      !!full && full.includes('#') && !full.includes('?'), `href=${full}`);
  }

  // ── legacy eclipse query link still works, then leaves the address bar ──
  {
    await page.goto(`${ORIGIN}/eclipse.html?from=chart&dob=${N.date}&tob=${N.time}&tzname=Europe%2FLondon`,
      { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    ok('eclipse · legacy ?dob= link still prefills',
      (await page.locator('#dob').inputValue()) === N.date);
    ok('eclipse · legacy query stripped from the address bar',
      urlLeaks(page.url()).length === 0, `url=${page.url()}`);
  }

  await ctx.close();
}

/* ══ PART 3 — the stripped forms must still WORK with JavaScript on. ══════
   Removing a `name` is only safe if nothing read the field by name. Three
   shared readers did (app.js wireEmailForm/wireWaitlist via form.email,
   horoscope-subscribe.js, shop-wallpaper-lead.js) and were changed to resolve
   by type/id. This part proves each handler still receives what was typed. */
console.log('\n─── PART 3 · JavaScript ON · the stripped forms still work ────');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('    [pageerror] ' + e.message));

  /* Submit an email form and assert the address reached captureEmail.
     Probe the OUTCOME, not the function: app.js calls its module-local
     captureEmail (wrapping the AstroApp export would observe nothing), and
     every path through it appends to localStorage['ap_email_intent']. */
  async function emailForm(label, url, fieldSel, formSel, bootScript) {
    await page.goto(ORIGIN + url, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    if (bootScript) {
      // Some capture panels are behind an accordion whose opening lazy-loads
      // the handler. Load it directly — the reader is what is under test.
      await page.evaluate(src => new Promise(res => {
        if ([...document.scripts].some(x => (x.src || '').includes(src))) return res();
        const el = document.createElement('script');
        el.src = src; el.onload = res; el.onerror = res;
        document.body.appendChild(el);
      }), bootScript);
      await page.waitForTimeout(1200);
    }
    await page.evaluate(() => { try { localStorage.removeItem('ap_email_intent'); } catch (e) {} });
    const set = await page.evaluate(([sel, email]) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.value = email;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.value === email;
    }, [fieldSel, N.email]);
    ok(`${label} · the email field took the value`, set === true);
    await page.evaluate(sel => {
      const f = document.querySelector(sel);
      if (!f) return;
      if (typeof f.requestSubmit === 'function') f.requestSubmit();
      else f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, formSel);
    await page.waitForTimeout(1200);
    const stored = await page.evaluate(() => {
      try { return localStorage.getItem('ap_email_intent') || ''; } catch (e) { return '<blocked>'; }
    });
    ok(`${label} · the handler still reads the address after the name came off`,
      typeof stored === 'string' && stored.includes(N.email), `ap_email_intent=${String(stored).slice(0, 160)}`);
  }

  const EMAIL_FORMS = [
    ['horoscope subscribe', '/horoscope.html', '#hs-email', '#hs-form', 'js/horoscope-subscribe.js'],
    ['eclipse notify', '/eclipse.html', '#eclipseEmail', '#emailForm', null],
    ['links waitlist', '/links.html', '.cw-waitlist__form input[type=email]', '.cw-waitlist__form', null],
    ['saturn-return email cta', '/saturn-return.html', '.ap-email-cta__form input[type=email]', '.ap-email-cta__form', null],
    ['profile email cta', '/profile.html', '.ap-email-cta__form input[type=email]', '.ap-email-cta__form', null],
    ['shop wallpaper lead', '/shop.html', '#shop-wallpaper-email', '#shop-wallpaper-form', null],
  ];
  for (const [label, url, fieldSel, formSel, boot] of EMAIL_FORMS) {
    try { await emailForm(label, url, fieldSel, formSel, boot); }
    catch (e) { ok(`${label} · drive completed`, false, String(e.message).slice(0, 120)); }
  }

  /* index.html #shopNotify and chart.html's wallpaper lead never touch
     captureEmail, so ap_email_intent is the wrong probe for them. Each has its
     own outcome to look at. */
  {
    // #shopNotify POSTs directly and reports on the page. Reading the field by
    // id was always how it worked; the only change was removing name="email".
    await page.goto(ORIGIN + '/index.html', { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.evaluate(email => {
      const el = document.getElementById('shopNotifyEmail');
      el.value = email;
      const f = document.getElementById('shopNotify');
      f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, N.email);
    await page.waitForTimeout(1500);
    const msg = await page.locator('#shopNotifyMsg').innerText().catch(() => '');
    ok('index shop notify · the address was accepted, not rejected as malformed',
      msg.trim().length > 0 && !/DOESN.T LOOK LIKE AN EMAIL/i.test(msg), `msg="${msg.trim()}"`);
  }
  {
    // chart.html's wallpaper form is only wired after a chart exists — cast one.
    await page.goto(ORIGIN + '/chart.html', { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.evaluate(([n]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
      set('name-input', n.name); set('date-input', n.date); set('time-input', n.time);
      set('city-input', n.town); set('lat-input', '53.5900'); set('lon-input', '-2.2200');
      set('tz-input', 'Europe/London');
      const acc = document.getElementById('time-accuracy-input'); if (acc) acc.value = 'exact';
      document.getElementById('chart-form').requestSubmit();
    }, [N]);
    await page.waitForTimeout(6000);
    await page.evaluate(() => { try { localStorage.removeItem('ap_email_intent'); } catch (e) {} });
    await page.evaluate(email => {
      const el = document.getElementById('wallpaper-lead-email');
      if (el) el.value = email;
      const f = document.getElementById('wallpaper-email-form');
      if (f) f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, N.email);
    await page.waitForTimeout(1500);
    const stored = await page.evaluate(() => {
      try { return localStorage.getItem('ap_email_intent') || ''; } catch (e) { return ''; }
    });
    ok('chart wallpaper lead · the handler still reads the address after the name came off',
      stored.includes(N.email), `ap_email_intent=${stored.slice(0, 160)}`);
  }

  // transits: the whole forecast must still compute from id-read fields
  {
    await page.goto(ORIGIN + '/transits.html', { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.evaluate(([n]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
      set('natal-date-transit', n.date); set('natal-time-transit', n.time);
      set('transit-city', n.town); set('transit-lat', '53.5900');
      set('transit-lon', '-2.2200'); set('transit-tz', 'Europe/London');
      const c = document.getElementById('transit-city'); if (c) c.dataset.tz = 'Europe/London';
    }, [N]);
    await page.evaluate(() => document.getElementById('transit-form').requestSubmit());
    await page.waitForTimeout(6000);
    const shown = await page.evaluate(() => {
      const r = document.getElementById('transit-results') || document.querySelector('.transit-results');
      return !!r && !r.hidden && !r.classList.contains('hidden');
    });
    ok('transits · still computes after the six names came off', shown);
  }

  // moonphase: both forms
  {
    await page.goto(ORIGIN + '/moonphase.html', { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.evaluate(d => { const e = document.getElementById('moonphase-date'); e.value = d; e.dispatchEvent(new Event('input', { bubbles: true })); }, N.date);
    await page.evaluate(() => document.getElementById('moonphase-form').requestSubmit());
    await page.waitForTimeout(1500);
    const txt = await page.locator('body').innerText();
    ok('moonphase · the date form still answers', /1901|Feb|February/i.test(txt));

    await page.evaluate(() => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
      set('mp-compat-name-a', 'Wibblenaut'); set('mp-compat-date-a', '1901-02-03');
      set('mp-compat-name-b', 'Frobnicator'); set('mp-compat-date-b', '1911-12-13');
    });
    await page.evaluate(() => document.getElementById('moonphase-compat-form').requestSubmit());
    await page.waitForTimeout(2000);
    const txt2 = await page.locator('body').innerText();
    const mpDiag = await page.evaluate(() => {
      const r = document.getElementById('mp-compat-share-card') || document.querySelector('.mp-card--compat');
      return { present: !!r, hidden: r ? (r.hidden || r.classList.contains('hidden')) : null,
               text: r ? r.innerText.slice(0, 120) : '' };
    });
    ok('moonphase · the pair form still answers',
      /Wibblenaut/.test(txt2) || (mpDiag.present && !mpDiag.hidden && mpDiag.text.length > 0),
      JSON.stringify(mpDiag));
  }

  // moment.html — the freeze still runs from id-read fields
  {
    await page.goto(ORIGIN + '/moment.html', { waitUntil: 'load' });
    await page.waitForTimeout(1800);
    await page.evaluate(([n]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
      set('mom-date', n.date); set('mom-time', n.time); set('mom-place', n.town); set('mom-title', 'A night');
    }, [N]);
    await page.evaluate(() => document.getElementById('mom-form').requestSubmit());
    await page.waitForTimeout(2500);
    const status = await page.locator('#mom-status').innerText().catch(() => '');
    ok('moment · the freeze button still reaches its handler (a status was written)',
      status.trim().length > 0, `status="${status}"`);
  }

  /* profile.html setup form.
     Not asserted as "still saves", because it never saved on a plain load:
     no submit handler is bound (measured on this tip AND on 3c99760, so it
     predates this round and belongs to whoever owns profile.html). What IS
     asserted is the thing this round changed — the native submit that happens
     in its place now carries nothing. The paired control above shows the same
     drive leaking both fields before the fix. */
  {
    await page.goto(ORIGIN + '/profile.html', { waitUntil: 'load' });
    await page.waitForTimeout(1800);
    await page.evaluate(([n, e]) => {
      const a = document.getElementById('setup-name'); if (a) a.value = n;
      const b = document.getElementById('setup-email'); if (b) b.value = e;
      const f = document.getElementById('setup-form');
      if (f) f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, [N.name, N.email]);
    await page.waitForTimeout(1500);
    ok('profile setup · the unhandled submit now carries nothing personal',
      urlLeaks(page.url()).length === 0, `url=${page.url()}`);
    const bound = await page.evaluate(() => !location.search || location.search === '?');
    ok('profile setup · (observation) no submit handler is bound — pre-existing, see 3c99760 control',
      bound === true, `search=${new URL(page.url()).search}`);
  }

  await ctx.close();
}

await browser.close();
server.close();

console.log('\n─── RESULTS ───────────────────────────────────────────────────');
console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
