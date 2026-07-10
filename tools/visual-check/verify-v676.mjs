import { chromium } from 'playwright';
import fs from 'fs';

fs.mkdirSync('out/v676', { recursive: true });
const b = await chromium.launch({ headless: true });
const r = [];
for (const [n, u] of [
  ['chart', '/chart.html?v=676'],
  ['mysky', '/mysky.html?v=676'],
  ['moment', '/moment.html?v=676'],
  ['home', '/?v=676'],
]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(() => localStorage.setItem('ap_intro_complete', '1'));
  await p.goto('http://localhost:8790' + u, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await p.waitForTimeout(2800);
  const m = await p.evaluate(() => {
    const titles = [...document.querySelectorAll('footer .footer-nav-col__title')].map((t) =>
      t.textContent.trim()
    );
    const col = [...document.querySelectorAll('footer .footer-nav-col')].find((c) =>
      /model|tools/i.test(c.querySelector('.footer-nav-col__title')?.textContent || '')
    );
    const links = col
      ? [...col.querySelectorAll('a')].map((a) => a.textContent.replace(/\s+/g, ' ').trim())
      : [];
    const sticky = !!document.querySelector('.ap-email-cta--sticky');
    const early = !!document.querySelector('#ap-engine-visuals.ap-ev--early');
    const chips = document.querySelectorAll('.ap-ev-tools a').length;
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
    const exploreLinks = document.querySelectorAll('a[href="explore.html"]').length;
    const spine00 = !!document.querySelector('h2') && /00\s*·\s*Explore/i.test(document.body.innerText);
    return { titles, links, sticky, early, chips, overlap, exploreLinks, spine00 };
  });
  await p.screenshot({ path: 'out/v676/' + n + '.png' });
  r.push({ page: n, ...m });
  await p.close();
}
await b.close();
console.log(JSON.stringify(r, null, 2));
