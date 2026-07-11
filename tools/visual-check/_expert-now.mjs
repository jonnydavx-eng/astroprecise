import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tools/visual-check/out/expert-bug-audit', { recursive: true });
const b = await chromium.launch({ args: ['--disable-gpu','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:8790/', { waitUntil: 'domcontentloaded', timeout: 45000 });
await p.waitForTimeout(5500);
const m = await p.evaluate(() => {
  const form = document.querySelector('#hero-cast-form, .hero-cast-dock, .cast-form, form.hero-form, #birth-form, .hero-copy form');
  const stage = document.querySelector('.hero-solar-stage, #orrery-viewport, .orrery-viewport');
  const email = document.querySelector('.ap-email-cta--sticky, .email-sticky, [class*="email"][class*="sticky"]');
  const canvas = document.querySelector('#orrery-canvas, canvas.orrery-canvas, .orrery-webgl canvas');
  const fr = form && form.getBoundingClientRect();
  const sr = stage && stage.getBoundingClientRect();
  const er = email && getComputedStyle(email).display !== 'none' ? email.getBoundingClientRect() : null;
  return {
    sw: document.querySelector('script') && (document.cookie || true),
    formTop: fr && Math.round(fr.top),
    formH: fr && Math.round(fr.height),
    stageH: sr && Math.round(sr.height),
    overlapY: fr && sr ? Math.round(Math.max(0, Math.min(fr.bottom, sr.bottom) - Math.max(fr.top, sr.top))) : null,
    stickyEmailVisible: !!(er && er.height > 0 && er.bottom > 0 && er.top < innerHeight),
    stickyEmailTop: er && Math.round(er.top),
    hasCanvas: !!canvas,
    bodyClasses: document.body.className.slice(0, 120),
  };
});
await p.screenshot({ path: 'tools/visual-check/out/expert-bug-audit/home-now-v682.png' });
await p.goto('http://127.0.0.1:8790/explore.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
await p.waitForTimeout(3000);
await p.screenshot({ path: 'tools/visual-check/out/expert-bug-audit/explore-now-v682.png' });
await p.goto('http://127.0.0.1:8790/horoscope.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
await p.waitForTimeout(2500);
const dm = await p.evaluate(() => {
  const email = document.querySelector('.ap-email-cta--sticky, body > .ap-email-cta, [class*="email-cta"]');
  const sticky = document.body.classList.contains('has-email-sticky');
  const grid = document.querySelector('#sign-picker-primary, .sign-grid, .sign-picker');
  const gr = grid && grid.getBoundingClientRect();
  return { stickyClass: sticky, emailVisible: !!(email && getComputedStyle(email).display !== 'none' && email.getBoundingClientRect().height > 20), formInViewish: gr && gr.top < innerHeight };
});
await p.screenshot({ path: 'tools/visual-check/out/expert-bug-audit/daily-now-v682.png' });
console.log('HOME', JSON.stringify(m));
console.log('DAILY', JSON.stringify(dm));
await b.close();
