/* Wave-A — 2D fallback Earth-forward check + provenance caption check. */
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'out/wavea-2026-07-10';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8790';

/* ── provenance caption on a shipped-mode page (transits = tools mode) ── */
{
  const b2 = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await b2.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {} if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} }; });
  for (const path of ['transits.html', 'why.html']) {
    await p.goto(BASE + '/' + path, { waitUntil: 'load', timeout: 60000 });
    await p.waitForTimeout(3000);
    const r = await p.evaluate(() => {
      const ev = document.getElementById('ap-engine-visuals');
      const cap = ev && ev.querySelector('.ap-ev__lede--provenance, .ap-ev__lede');
      return {
        mounted: !!ev,
        mode: ev ? ev.className.replace(/\s+/g, ' ') : null,
        caption: cap ? (cap.textContent || '').trim() : null,
        capSize: cap ? getComputedStyle(cap).fontSize : null,
      };
    });
    console.log(`${r.mounted && r.caption && /Same 3D engine/i.test(r.caption) ? 'PASS' : 'FAIL'}  provenance caption on ${path} — ${JSON.stringify(r)}`);
  }
  await b2.close();
}

/* ── 2D fallback: WebGL blocked → Earth-forward composition, no errors ── */
{
  const b = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis', '--disable-gpu'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await p.addInitScript(() => { try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {} });
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const glProbe = await p.evaluate(() => {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
  });
  console.log(`${glProbe === false ? 'PASS' : 'FAIL'}  env: WebGL blocked — probe=${glProbe}`);
  await p.waitForTimeout(14000);
  const state = await p.evaluate(() => ({
    htmlClass: document.documentElement.className,
    orrery: typeof window.Orrery3D,
    ready: !!window.__orreryReady,
  }));
  console.log('state:', JSON.stringify(state));
  const hero = await p.$('#heroChapter, .ap-chapter--hero, #orrery-canvas');
  if (hero) await hero.screenshot({ path: `${OUT}/fallback-hero.png` }).catch(() => p.screenshot({ path: `${OUT}/fallback-hero.png` }));
  else await p.screenshot({ path: `${OUT}/fallback-hero.png` });
  console.log(`${errs.length === 0 ? 'PASS' : 'FAIL'}  fallback: no page errors — ${errs.length ? errs.join(' | ') : 'clean'}`);
  await b.close();
}
