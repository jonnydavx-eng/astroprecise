/**
 * v575 hero HUD verification — seal pills, scale strip, cosmic journey, time row.
 * Runs against the standing preview server. Screenshots → out/redesign/hud-v575-*.png
 * Usage: node hud-v575-verify.mjs [baseUrl]
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

async function bootPage(browser, vp) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
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
    ok(`${tag}: WebGL engine booted (Orrery3D.isWebGL !== false)`);
    return true;
  } catch {
    fail(`${tag}: WebGL engine did not boot within 45s`);
    return false;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });

  /* ════════ Desktop 1440x900 ════════ */
  {
    const { ctx, page, errors } = await bootPage(browser, { width: 1440, height: 900 });
    const gl = await waitWebGL(page, 'desktop');

    // 1 · seal pills
    const seals = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#orrery-lite-deck .lite-vp-btn[data-lite-planet]')];
      const imgs = [...document.querySelectorAll('#orrery-lite-deck .lite-vp-btn .ap-seal__art')];
      return {
        pills: btns.map((b) => b.getAttribute('data-lite-planet')),
        sealCount: imgs.length,
        sealLoaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
        sealBox: imgs[0] ? imgs[0].getBoundingClientRect().height : 0,
      };
    });
    if (seals.sealCount === 10 && seals.sealLoaded === 10) ok(`desktop: 10 SVG seals render, all loaded (${seals.pills.join(',')})`);
    else fail(`desktop: seals count=${seals.sealCount} loaded=${seals.sealLoaded} pills=${seals.pills.join(',')}`);

    if (gl) {
      // 2 · auto-dive → EARTH active
      try {
        await page.waitForFunction(() => window.Orrery3D.getScaleLevel && window.Orrery3D.getScaleLevel() === 0, null, { timeout: 20000 });
        await sleep(1800); // let the dive animation land
        const strip = await page.evaluate(() => {
          const s = document.getElementById('ap-scale-strip');
          const act = document.querySelector('#ap-scale-strip .orrery-scale-btn.active');
          const cap = document.getElementById('ap-scale-caption');
          return {
            visible: s && !s.hidden && getComputedStyle(s).display !== 'none',
            stations: [...document.querySelectorAll('#ap-scale-strip .orrery-scale-btn')].map((b) => b.textContent.trim()),
            active: act ? act.getAttribute('data-scale') : null,
            caption: cap ? cap.textContent.trim() : '',
          };
        });
        if (strip.visible && strip.stations.length === 7) ok(`desktop: scale strip present (${strip.stations.join(' · ')})`);
        else fail(`desktop: strip visible=${strip.visible} stations=${strip.stations.length}`);
        if (strip.active === '0') ok('desktop: EARTH active after auto-dive');
        else fail(`desktop: active station after dive = ${strip.active}`);
        if (strip.caption.includes('Positions live (VSOP87)')) ok(`desktop: honesty caption "${strip.caption}"`);
        else fail(`desktop: caption "${strip.caption}"`);
      } catch { fail('desktop: auto-dive to Earth (scale 0) never happened'); }

      // 3 · time row visible + live date
      const time = await page.evaluate(() => {
        const t = document.querySelector('#orrery-lite-deck .ap-orrery-time');
        const d = document.getElementById('lite-date-display');
        const scrub = document.getElementById('lite-scrub');
        return {
          rowVisible: t && getComputedStyle(t).display !== 'none',
          scrubVisible: scrub && getComputedStyle(scrub).display !== 'none',
          date: d ? d.textContent.trim() : '',
        };
      });
      if (time.rowVisible && time.scrubVisible && time.date && !/Computing/.test(time.date)) ok(`desktop: time row visible, live date "${time.date}"`);
      else fail(`desktop: time row=${time.rowVisible} scrub=${time.scrubVisible} date="${time.date}"`);

      // 4 · overlap check — trust chips must stay clear of the deck
      const overlap = await page.evaluate(() => {
        const trust = document.querySelector('#heroChapter .hero-solar-trust');
        const deck = document.getElementById('orrery-lite-deck');
        const tb = trust ? trust.getBoundingClientRect() : null;
        const db = deck ? deck.getBoundingClientRect() : null;
        return { trustBottom: tb ? tb.bottom : -1, deckTop: db ? db.top : -1, deckHeight: db ? db.height : -1 };
      });
      if (overlap.trustBottom > 0 && overlap.trustBottom <= overlap.deckTop) ok(`desktop: no HUD overlap (trust bottom ${Math.round(overlap.trustBottom)} <= deck top ${Math.round(overlap.deckTop)}, deck h=${Math.round(overlap.deckHeight)})`);
      else fail(`desktop: OVERLAP trust bottom ${Math.round(overlap.trustBottom)} vs deck top ${Math.round(overlap.deckTop)}`);

      await page.screenshot({ path: join(OUT, 'hud-v575-desktop-earth.png') });

      // 5 · click SYSTEM — camera animates
      await page.click('#ap-scale-strip .orrery-scale-btn[data-scale="2"]');
      await sleep(650);
      await page.screenshot({ path: join(OUT, 'hud-v575-desktop-system-mid.png') });
      await sleep(1400);
      await page.screenshot({ path: join(OUT, 'hud-v575-desktop-system.png') });
      const sys = await page.evaluate(() => ({
        level: window.Orrery3D.getScaleLevel(),
        active: (document.querySelector('#ap-scale-strip .orrery-scale-btn.active') || {}).textContent,
      }));
      if (sys.level === 2 && /System/i.test(sys.active || '')) ok('desktop: SYSTEM click animated to level 2, station active');
      else fail(`desktop: after SYSTEM click level=${sys.level} active=${sys.active}`);

      // 6 · scrub drives the engine, Now resets
      await page.evaluate(() => {
        const s = document.getElementById('lite-scrub');
        s.value = '365';
        s.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await sleep(400);
      const scrubbed = await page.evaluate(() => ({
        off: Math.round(window.Orrery3D.getDayOffset()),
        date: document.getElementById('lite-date-display').textContent.trim(),
      }));
      if (Math.abs(scrubbed.off - 365) < 2 && /\+365d/.test(scrubbed.date)) ok(`desktop: scrub drives engine (offset ${scrubbed.off}, "${scrubbed.date}")`);
      else fail(`desktop: scrub → offset ${scrubbed.off}, date "${scrubbed.date}"`);
      await page.click('#lite-now-btn');
      await sleep(400);
      const nowed = await page.evaluate(() => ({
        off: Math.round(window.Orrery3D.getDayOffset()),
        date: document.getElementById('lite-date-display').textContent.trim(),
      }));
      if (Math.abs(nowed.off) < 1 && /now/.test(nowed.date)) ok(`desktop: Now resets ("${nowed.date}")`);
      else fail(`desktop: Now → offset ${nowed.off}, date "${nowed.date}"`);

      // 7 · cosmic journey — narrated tour
      const jbtnVisible = await page.evaluate(() => {
        const b = document.getElementById('ap-cosmic-journey');
        return b && !b.hidden && getComputedStyle(b).display !== 'none';
      });
      if (jbtnVisible) ok('desktop: Cosmic journey button visible (feature-detected)');
      else fail('desktop: Cosmic journey button not visible');
      await page.click('#ap-cosmic-journey');
      await sleep(500);
      const jState = await page.evaluate(() => ({
        active: window.Orrery3D.isJourneyActive(),
        label: document.getElementById('ap-cosmic-journey').textContent.trim(),
      }));
      if (jState.active && /End journey/.test(jState.label)) ok(`desktop: journey started (button → "${jState.label}")`);
      else fail(`desktop: journey active=${jState.active} label="${jState.label}"`);
      await sleep(5000); // mid-tour
      await page.screenshot({ path: join(OUT, 'hud-v575-desktop-journey-mid.png') });
      const jMid = await page.evaluate(() => ({
        level: window.Orrery3D.getScaleLevel(),
        active: window.Orrery3D.isJourneyActive(),
        caption: document.getElementById('ap-scale-caption').textContent.trim(),
      }));
      if (jMid.active && jMid.level > 0) ok(`desktop: journey progressing (level ${jMid.level}, caption "${jMid.caption}")`);
      else fail(`desktop: mid-journey level=${jMid.level} active=${jMid.active}`);
      await page.click('#ap-cosmic-journey'); // end tour
      await sleep(600);
      const jEnd = await page.evaluate(() => ({
        active: window.Orrery3D.isJourneyActive(),
        label: document.getElementById('ap-cosmic-journey').textContent.trim(),
      }));
      if (!jEnd.active && /Cosmic journey/.test(jEnd.label)) ok('desktop: journey cancel restores button');
      else fail(`desktop: after cancel active=${jEnd.active} label="${jEnd.label}"`);
    }

    if (errors.length === 0) ok('desktop: zero console errors');
    else fail(`desktop: ${errors.length} console errors — ${errors.slice(0, 4).join(' | ')}`);
    await ctx.close();
  }

  /* ════════ Mobile 390x844 ════════ */
  {
    const { ctx, page, errors } = await bootPage(browser, { width: 390, height: 844 });
    const gl = await waitWebGL(page, 'mobile');

    if (gl) {
      try {
        await page.waitForFunction(() => window.Orrery3D.getScaleLevel && window.Orrery3D.getScaleLevel() === 0, null, { timeout: 20000 });
      } catch { /* checked below */ }
      await sleep(1800);

      const mob = await page.evaluate(() => {
        const track = document.querySelector('#ap-scale-strip .ap-scale-strip__track');
        const stepper = document.querySelector('#ap-scale-strip .ap-scale-stepper');
        const label = document.getElementById('ap-scale-stepper-label');
        const imgs = [...document.querySelectorAll('#orrery-lite-deck .lite-vp-btn .ap-seal__art')];
        return {
          trackHidden: !track || getComputedStyle(track).display === 'none',
          stepperVisible: stepper && getComputedStyle(stepper).display !== 'none',
          label: label ? label.textContent.trim() : '',
          seals: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
        };
      });
      if (mob.trackHidden && mob.stepperVisible) ok(`mobile: strip collapses to stepper (label "${mob.label}")`);
      else fail(`mobile: trackHidden=${mob.trackHidden} stepperVisible=${mob.stepperVisible}`);
      if (/earth/i.test(mob.label)) ok('mobile: stepper shows EARTH after auto-dive');
      else fail(`mobile: stepper label "${mob.label}" after dive`);
      if (mob.seals === 10) ok('mobile: 10 seals loaded');
      else fail(`mobile: seals loaded = ${mob.seals}`);

      await page.evaluate(() => document.getElementById('orrery-lite-deck').scrollIntoView({ block: 'center' }));
      await sleep(600);
      await page.screenshot({ path: join(OUT, 'hud-v575-mobile-deck.png') });

      // stepper next → INNER
      await page.click('#ap-scale-next');
      await sleep(1800);
      const stepped = await page.evaluate(() => ({
        level: window.Orrery3D.getScaleLevel(),
        label: document.getElementById('ap-scale-stepper-label').textContent.trim(),
      }));
      if (stepped.level === 1 && /inner/i.test(stepped.label)) ok('mobile: stepper › advances EARTH → INNER');
      else fail(`mobile: after › level=${stepped.level} label="${stepped.label}"`);

      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(500);
      await page.screenshot({ path: join(OUT, 'hud-v575-mobile.png') });
    }

    if (errors.length === 0) ok('mobile: zero console errors');
    else fail(`mobile: ${errors.length} console errors — ${errors.slice(0, 4).join(' | ')}`);
    await ctx.close();
  }

  await browser.close();
  const fails = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - fails}/${results.length} checks passed`);
  process.exit(fails ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
