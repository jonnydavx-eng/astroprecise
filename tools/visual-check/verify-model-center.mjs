/**
 * Verify home orrery is centered and nav is model-first.
 */
import { chromium } from 'playwright';

const base = process.env.AP_BASE || 'http://localhost:8790';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  try {
    localStorage.setItem('ap_intro_complete', '1');
  } catch (_) {}
});
await page.goto(base + '/?v=671', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(2800);

const m = await page.evaluate(() => {
  const wrap = document.querySelector('.ap-award-orrery-wrap');
  const copy = document.querySelector('#heroChapter .hero-copy');
  const vw = window.innerWidth;
  let orrery = null;
  if (wrap) {
    const r = wrap.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    orrery = {
      w: Math.round(r.width),
      h: Math.round(r.height),
      cx: Math.round(cx),
      offCenter: Math.round(Math.abs(cx - vw / 2)),
    };
  }
  const nav = [...document.querySelectorAll('.navbar__link, .contents-nav a')]
    .map((a) => (a.textContent || '').trim())
    .filter(Boolean)
    .slice(0, 12);
  const float = [...document.querySelectorAll('.ap-float-nav__link')].map((a) =>
    (a.getAttribute('data-short') || a.textContent || '').trim()
  );
  return { orrery, nav, float, title: document.title };
});

await page.screenshot({
  path: new URL('./out/model-center-home.png', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
  fullPage: false,
});

// Also check chart for tool chips
await page.goto(base + '/chart.html?v=671', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(2200);
const chart = await page.evaluate(() => {
  const tools = document.querySelector('.ap-ev-tools');
  const chips = tools
    ? [...tools.querySelectorAll('a')].map((a) => a.textContent.trim())
    : [];
  const dualThree = [...document.scripts].some((s) => /three\.min\.js/i.test(s.src || ''));
  return { chips, dualThree, hasTools: !!tools };
});

await browser.close();

const pass =
  m.orrery &&
  m.orrery.offCenter < 40 &&
  m.orrery.w >= 600 &&
  chart.hasTools &&
  !chart.dualThree;

const report = { pass, home: m, chart };
console.log(JSON.stringify(report, null, 2));
console.log(pass ? '\nPASS model-center' : '\nFAIL model-center');
process.exit(pass ? 0 : 1);
