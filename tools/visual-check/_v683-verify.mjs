import { chromium } from 'playwright';
import fs from 'fs';
const out = 'tools/visual-check/out/v683';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--disable-gpu','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const results = [];

async function run(label, delayMs, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto('http://127.0.0.1:8790/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await p.evaluate(async () => {
    try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch(_){}
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(delayMs);
  const m = await p.evaluate(() => {
    const form = document.querySelector('#heroChapter .hero-copy, #hero-chart-form')?.closest('.hero-copy') || document.querySelector('#heroChapter .hero-copy');
    const stage = document.querySelector('#heroChapter .hero-solar-stage');
    const canvas = document.querySelector('#orrery-canvas, canvas');
    const fr = form?.getBoundingClientRect();
    const sr = stage?.getBoundingClientRect();
    const date = document.querySelector('#hero-birthdate');
    const dr = date?.getBoundingClientRect();
    return {
      formTop: fr && Math.round(fr.top),
      formBottom: fr && Math.round(fr.bottom),
      formInView: fr ? fr.top < innerHeight - 20 : false,
      dateInView: dr ? dr.top < innerHeight - 8 && dr.bottom > 0 : false,
      stageH: sr && Math.round(sr.height),
      overlapY: fr && sr ? Math.round(Math.max(0, Math.min(fr.bottom, sr.bottom) - Math.max(fr.top, sr.top))) : null,
      bodyClass: document.body.className.includes('ap-award'),
      orreryFull: document.documentElement.classList.contains('orrery-full'),
      hasCanvas: !!canvas,
    };
  });
  await p.screenshot({ path: `${out}/${label}.png` });
  results.push({ label, delayMs, m, errors: errors.slice(0, 4) });
  await ctx.close();
}

await run('load-t600', 600);
await run('load-t1500', 1500);
await run('load-t4000', 4000);
await run('load-t5500', 5500);
// longer settle for focus earth
await run('home-rest', 6500);

await b.close();
fs.writeFileSync(`${out}/metrics.json`, JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(r.label, JSON.stringify(r.m), 'errs', r.errors.length);
}
const rest = results.find(r => r.label === 'home-rest');
const pass =
  rest &&
  rest.m.formInView &&
  rest.m.dateInView &&
  (rest.m.overlapY === 0 || rest.m.overlapY == null) &&
  rest.m.formTop < 860;
console.log(pass ? 'PASS v683 cast peek' : 'FAIL v683 cast peek', rest?.m);
process.exit(pass ? 0 : 1);
