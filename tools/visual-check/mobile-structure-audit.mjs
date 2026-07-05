/** Mobile layout structure audit — viewport, overflow, nav shells, drawer, bottom bar. */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out', 'mobile-structure');
const BASES = process.argv.slice(2);
if (!BASES.length) BASES.push('http://localhost:8790', 'https://astroprecise.app');

const PAGES = [
  { id: 'index', path: '/?lite=1' },
  { id: 'chart', path: '/chart.html' },
  { id: 'horoscope', path: '/horoscope.html' },
  { id: 'compatibility', path: '/compatibility.html' },
  { id: 'shop', path: '/shop.html' },
  { id: 'cosmic-story', path: '/cosmic-story.html' },
  { id: 'transits', path: '/transits.html' },
  { id: 'ephemeris', path: '/ephemeris.html' },
  { id: 'profile', path: '/profile.html' },
  { id: 'leo', path: '/leo.html' },
];

function hostLabel(base) {
  return base.replace(/^https?:\/\//, '');
}

async function probePage(page, base, p) {
  const issues = [];
  await page.goto(`${base}${p.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(p.id === 'index' ? 2500 : 1800);

  const s = await page.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]')?.content || '';
    const sw = document.documentElement.scrollWidth;
    const iw = window.innerWidth;
    const overflow = sw > iw + 2;
    const toggle = document.querySelector('.navbar__toggle');
    const toggleVis = toggle ? getComputedStyle(toggle).display !== 'none' : null;
    const bottom = document.querySelector('.bottom-nav');
    const bottomVis = bottom ? getComputedStyle(bottom).display !== 'none' : false;
    const bottomH = bottom ? bottom.offsetHeight : 0;
    const nav = document.querySelector('.navbar');
    const masthead = document.querySelector('.masthead');
    const contentsNav = document.querySelector('.contents-nav');
    const mobileMenu = document.querySelector('.navbar__mobile-menu');
    const drawerLinks = mobileMenu ? mobileMenu.querySelectorAll('.navbar__link').length : 0;
    const bodyPad = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
    const smallTargets = [...document.querySelectorAll('a,button,input,select,textarea,[role=button]')]
      .filter((el) => {
        if (el.closest('[aria-hidden=true]') || el.getAttribute('aria-hidden') === 'true') return false;
        if (el.closest('svg') && !el.matches('a,button,[role=button]')) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return false;
        if (r.bottom < 0 || r.top > innerHeight) return false;
        return r.width < 40 || r.height < 40;
      })
      .slice(0, 6)
      .map((el) => ({
        tag: el.tagName,
        cls: String(el.className || '').slice(0, 48),
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
      }));
    return {
      vp,
      overflow,
      sw,
      iw,
      toggleVis,
      bottomVis,
      bottomH,
      hasNavbar: !!nav,
      hasMasthead: !!masthead,
      contentsNav: !!contentsNav,
      drawerLinks,
      bodyPad,
      smallTargets,
    };
  });

  if (!/width=device-width/i.test(s.vp)) issues.push('missing viewport meta');
  if (s.overflow) issues.push(`horizontal overflow ${s.sw}>${s.iw}`);
  if (s.hasNavbar && s.toggleVis !== true) issues.push('hamburger hidden on mobile');
  if (s.hasNavbar && !s.bottomVis) issues.push('bottom-nav missing');
  if (s.hasNavbar && s.bottomH < 44) issues.push(`bottom-nav too short ${s.bottomH}`);
  if (s.hasNavbar && s.drawerLinks < 8) issues.push(`drawer thin links=${s.drawerLinks}`);
  if (!s.hasNavbar && !s.hasMasthead) issues.push('no nav shell');
  if (s.hasNavbar && s.bodyPad < 50) issues.push(`body pad-bottom low ${s.bodyPad}`);
  if (s.smallTargets.length > 4) issues.push(`many small tap targets (${s.smallTargets.length})`);

  return {
    base: hostLabel(base),
    page: p.id,
    ok: issues.length === 0,
    issues,
    ...s,
  };
}

async function probeDrawer(page, base) {
  const issues = [];
  await page.goto(`${base}/chart.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500);
  const toggle = page.locator('#nav-toggle, .navbar__toggle').first();
  if (!(await toggle.count())) {
    return { base: hostLabel(base), page: 'chart:drawer', ok: false, issues: ['no toggle'] };
  }
  await toggle.click();
  await page.waitForTimeout(400);
  const drawer = await page.evaluate(() => {
    const m = document.querySelector('.navbar__mobile-menu');
    const open = m?.classList.contains('open');
    const expanded = document.querySelector('.navbar__toggle')?.getAttribute('aria-expanded') === 'true';
    const links = m ? [...m.querySelectorAll('.navbar__link')].map((a) => a.textContent.trim()) : [];
    const bottom = document.querySelector('.bottom-nav');
    const bottomHidden = bottom ? getComputedStyle(bottom).display === 'none' : true;
    return { open, expanded, links, bottomHidden };
  });
  if (!drawer.open) issues.push('drawer not open');
  if (!drawer.expanded) issues.push('aria-expanded false');
  if (!drawer.bottomHidden) issues.push('bottom-nav still visible');
  if (!drawer.links.includes('Readings')) issues.push('drawer missing Readings');
  if (!drawer.links.includes('Library')) issues.push('drawer missing Library');
  return { base: hostLabel(base), page: 'chart:drawer', ok: issues.length === 0, issues, drawer };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const results = [];
  const browser = await chromium.launch({ headless: true });

  for (const base of BASES) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/136 Mobile Safari/537.36',
      isMobile: true,
      hasTouch: true,
    });
    await ctx.addInitScript(() => {
      try {
        sessionStorage.setItem('ap_intro_complete', '1');
        localStorage.setItem('ap_privacy_ack', '1');
      } catch (_) {}
    });

    for (const p of PAGES) {
      const page = await ctx.newPage();
      try {
        results.push(await probePage(page, base, p));
      } catch (e) {
        results.push({ base: hostLabel(base), page: p.id, ok: false, issues: [String(e.message)] });
      }
      await page.close();
    }

    const drawerPage = await ctx.newPage();
    try {
      results.push(await probeDrawer(drawerPage, base));
    } catch (e) {
      results.push({ base: hostLabel(base), page: 'chart:drawer', ok: false, issues: [String(e.message)] });
    }
    await drawerPage.close();
    await ctx.close();
  }

  await browser.close();

  const fails = results.filter((r) => !r.ok);
  for (const r of results) {
    const extra = r.issues?.length ? ` — ${r.issues.join('; ')}` : '';
    console.log(`${r.ok ? 'OK' : 'FAIL'} [${r.base}] ${r.page}${extra}`);
    if (!r.ok && r.smallTargets?.length) console.log('  small targets:', JSON.stringify(r.smallTargets));
    if (r.drawer) console.log('  drawer:', JSON.stringify({ ...r.drawer, links: r.drawer.links?.slice(0, 14) }));
  }
  const report = { capturedAt: new Date().toISOString(), results, passed: results.length - fails.length, total: results.length };
  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\n${report.passed}/${report.total} mobile structure checks passed`);
  console.log(`Report: ${join(OUT, 'report.json')}`);
  process.exit(fails.length ? 1 : 0);
}

main();