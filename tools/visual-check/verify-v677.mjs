import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('out/v677', { recursive: true });
const b = await chromium.launch({ headless: true });
const r = [];
for (const [n, u] of [
  ['home', '/?v=677'],
  ['explore', '/explore.html?v=677'],
  ['chart', '/chart.html?v=677'],
  ['mysky', '/mysky.html?v=677'],
]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(() => localStorage.setItem('ap_intro_complete', '1'));
  await p.goto('http://localhost:8790' + u, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await p.waitForTimeout(2800);
  const m = await p.evaluate(() => {
    const footText = (document.querySelector('footer')?.innerText || '').slice(0, 400);
    const hasExplore = /Explore/.test(footText);
    const hasAround = /Around the model/.test(footText);
    const sticky = !!document.querySelector('.ap-email-cta--sticky');
    let overlap = null;
    const wrap = document.querySelector('#heroChapter .ap-award-orrery-wrap');
    const copy = document.querySelector('#heroChapter .hero-copy');
    if (wrap && copy) {
      const wr = wrap.getBoundingClientRect();
      const cr = copy.getBoundingClientRect();
      overlap = Math.round(
        Math.max(0, Math.min(wr.bottom, cr.bottom) - Math.max(wr.top, cr.top))
      );
    }
    return {
      hasExplore,
      hasAround,
      sticky,
      overlap,
      chips: document.querySelectorAll('.ap-ev-tools a').length,
      dualThree: [...document.scripts].some((s) => /three\.min\.js/i.test(s.src || '')),
    };
  });
  await p.screenshot({ path: 'out/v677/' + n + '.png', fullPage: false });
  // scroll to footer
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'out/v677/' + n + '-footer.png', fullPage: false });
  r.push({ page: n, ...m });
  await p.close();
}
await b.close();
console.log(JSON.stringify(r, null, 2));
