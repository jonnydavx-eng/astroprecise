/* Live recon — learn v705 nav/masthead/footer selectors + version, real-user mode */
import { chromium } from 'playwright';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });
const ctx = await b.newContext({
  viewport: { width: 1440, height: 900 }, userAgent: DESK_UA,
  serviceWorkers: 'block', bypassCSP: true,
});
await ctx.addInitScript(() => { try { localStorage.setItem('ap_intro_complete','1'); localStorage.setItem('ap_privacy_ack','1'); } catch(e){} if (typeof window.chrome==='undefined') window.chrome={runtime:{}}; });
const p = await ctx.newPage();
await p.route('**/*', r => r.continue());
await p.goto('https://astroprecise.app/', { waitUntil: 'load', timeout: 60000 });
await p.mouse.move(300,300); await p.mouse.down(); await p.mouse.up();
await p.waitForTimeout(2500);
const info = await p.evaluate(() => {
  const meta = {};
  document.querySelectorAll('meta').forEach(m => { const k=m.getAttribute('name')||m.getAttribute('property'); if(k)meta[k]=m.getAttribute('content'); });
  const swV = (self.registration && self.registration.active) ? 'sw' : null;
  // find masthead/header
  const headerSel = ['.masthead','.site-header','header','#apMasthead','.navbar','.ap-masthead'].filter(s=>document.querySelector(s));
  const navSel = ['.bottom-nav','.navbar__nav','.masthead__nav','.ap-nav','nav'].filter(s=>document.querySelector(s));
  const footSel = ['footer','.site-footer','.footer'].filter(s=>document.querySelector(s));
  const header = document.querySelector(headerSel[0]);
  const navLinks = [...document.querySelectorAll('header a, .masthead a, nav a')].map(a=>({t:(a.textContent||'').trim().slice(0,24), href:a.getAttribute('href')})).filter(x=>x.t);
  const footer = document.querySelector('footer');
  return {
    title: document.title,
    version: (document.documentElement.getAttribute('data-ap-version')||meta['ap-version']||meta['version']||(document.querySelector('[data-version]')?.getAttribute('data-version'))||'?'),
    htmlClasses: [...document.documentElement.classList],
    bodyClasses: [...document.body.classList],
    headerSel, navSel, footSel,
    headerHTML: header ? header.outerHTML.slice(0,600) : null,
    navLinks: navLinks.slice(0,40),
    footerLinkCount: footer ? footer.querySelectorAll('a').length : 0,
    footerText: footer ? (footer.textContent||'').replace(/\s+/g,' ').trim().slice(0,300) : null,
    themeColor: meta['theme-color'],
    ogImage: meta['og:image'],
  };
});
console.log(JSON.stringify(info, null, 2));
// Also dump list of <script src> and version query
const assets = await p.evaluate(() => {
  const scripts = [...document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'));
  const links = [...document.querySelectorAll('link[href]')].map(s=>({rel:s.rel, href:s.getAttribute('href')}));
  return { scripts, links };
});
console.log('ASSETS', JSON.stringify(assets, null, 2));
await b.close();
