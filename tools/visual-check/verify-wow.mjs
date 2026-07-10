import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
for (const [url, id] of [
  ['/', 'home'],
  ['/chart.html', 'chart'],
  ['/mysky.html', 'mysky'],
  ['/shop.html', 'shop'],
]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://localhost:8790' + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForTimeout(id === 'home' ? 2500 : 1500);
  const t = await p.evaluate(() => {
    const g = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        fs: s.fontSize,
        ff: s.fontFamily.split(',')[0].replace(/["']/g, ''),
        color: s.color,
        fw: s.fontWeight,
      };
    };
    return {
      h1: g(document.querySelector('h1')),
      p: g(
        document.querySelector(
          '.hero-copy p, .chart-hero p:not(.chart-hero__eyebrow), .mysky-hero__sub, main .mysky-card p, .shop-hero p'
        )
      ),
      clarity: !!document.getElementById('ap-css-visual-clarity'),
      dual: !!(
        document.querySelector('script[src*="three.min"]') &&
        document.querySelector('script[type="importmap"]')
      ),
    };
  });
  console.log(id, JSON.stringify(t));
  await p.screenshot({ path: 'out/wow-study/' + id + '-after.png', fullPage: false });
  await p.close();
}
await b.close();
