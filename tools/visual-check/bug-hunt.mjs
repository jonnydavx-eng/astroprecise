/** Quick bug hunt — console errors + phase2 DOM checks across key pages. */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8790';
const PAGES = [
  { id: 'chart', path: '/chart.html' },
  { id: 'horoscope', path: '/horoscope.html' },
  { id: 'transits', path: '/transits.html' },
  { id: 'shop', path: '/shop.html' },
  { id: 'cosmic-story', path: '/cosmic-story.html' },
  { id: 'ephemeris', path: '/ephemeris.html' },
  { id: 'compatibility', path: '/compatibility.html' },
  { id: 'synastry', path: '/synastry.html' },
  { id: 'lifepath', path: '/lifepath.html' },
  { id: 'profile', path: '/profile.html' },
  { id: 'moonphase', path: '/moonphase.html' },
  { id: 'chart-view', path: '/chart-view.html?n=Test&d=1990-06-15&t=12:00&lat=51.5&lon=-0.12&tz=Europe/London' },
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => {
  try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
  try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
});

const bugs = [];

for (const p of PAGES) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('JS:' + String(e.message || e).slice(0, 120)));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push('con:' + m.text().slice(0, 120));
  });
  try {
    await page.goto(BASE + p.path, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(p.id === 'transits' ? 8000 : 2500);
    const checks = await page.evaluate((id) => {
      const out = { id };
      if (id === 'chart') {
        const host = document.getElementById('chart-ai-panel');
        out.aiPanel = !!(host && host.classList.contains('ap-ai-panel'));
        out.timeGuide = !!document.getElementById('time-accuracy-guide');
      }
      if (id === 'transits') {
        const host = document.getElementById('transits-ai-panel');
        out.aiPanel = !!(host && host.classList.contains('ap-ai-panel'));
      }
      if (id === 'horoscope') {
        const host = document.getElementById('horoscope-ai-panel');
        out.aiPanel = !!(host && host.classList.contains('ap-ai-panel'));
      }
      if (id === 'transits') {
        out.dailyCard = !!document.querySelector('#daily-transit-card .dt-card');
        out.bridgeFooter = !!document.querySelector('.dt-bridge-footer');
      }
      if (id === 'chart-view') {
        out.wheel = !!document.getElementById('natal-wheel');
      }
      if (id === 'cosmic-story') {
        out.footerStrip = !!document.querySelector('.footer-zodiac-strip');
        const host = document.getElementById('cosmic-story-ai-panel');
        out.aiPanel = !!(host && host.classList.contains('ap-ai-panel'));
      }
      if (id === 'ephemeris') {
        const host = document.getElementById('ephemeris-ai-panel');
        out.aiPanel = !!(host && host.classList.contains('ap-ai-panel'));
      }
      if (id === 'compatibility') {
        const host = document.getElementById('compatibility-ai-panel');
        out.aiPanel = !!(host && host.classList.contains('ap-ai-panel'));
      }
      if (id === 'synastry') {
        const host = document.getElementById('synastry-ai-panel');
        out.aiPanel = !!(host && host.classList.contains('ap-ai-panel'));
      }
      if (id === 'lifepath') {
        const host = document.getElementById('lifepath-ai-panel');
        out.aiPanel = !!(host && host.classList.contains('ap-ai-panel'));
      }
      if (id === 'profile') {
        const host = document.getElementById('profile-ai-panel');
        out.aiPanel = !!(host && host.classList.contains('ap-ai-panel'));
      }
      if (id === 'moonphase') {
        const host = document.getElementById('moonphase-ai-panel');
        out.aiPanel = !!(host && host.classList.contains('ap-ai-panel'));
      }
      return out;
    }, p.id);
    const filtered = errs.filter((e) => !/noaa|swpc|ovation|favicon/i.test(e));
    if (filtered.length) bugs.push({ page: p.id, type: 'console', detail: filtered });
    if (p.id === 'transits' && checks.dailyCard && !checks.bridgeFooter) {
      bugs.push({ page: p.id, type: 'missing', detail: 'dt-bridge-footer not on transit card' });
    }
    if (p.id === 'cosmic-story' && !checks.footerStrip) {
      bugs.push({ page: p.id, type: 'missing', detail: 'footer-zodiac-strip not patched' });
    }
    if (p.id === 'chart-view' && !checks.wheel) {
      bugs.push({ page: p.id, type: 'missing', detail: 'natal-wheel host missing' });
    }
    if (['chart', 'transits', 'horoscope', 'ephemeris', 'cosmic-story', 'compatibility', 'synastry', 'lifepath', 'profile', 'moonphase'].includes(p.id) && !checks.aiPanel) {
      bugs.push({ page: p.id, type: 'missing', detail: 'ap-ai-panel not mounted' });
    }
  } catch (e) {
    bugs.push({ page: p.id, type: 'load', detail: String(e).slice(0, 150) });
  }
  await page.close();
}

// Chart compute + share strip wiring
{
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
  await page.goto(BASE + '/chart.html', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
    };
    set('name-input', 'Audit Test');
    set('date-input', '1990-06-15');
    set('time-input', '14:30');
    set('city-input', 'London');
    set('lat-input', '51.5074');
    set('lon-input', '-0.1278');
    set('tz-input', 'Europe/London');
  });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /calculate|cast/i.test(b.textContent || ''));
    if (btn) btn.click();
  });
  await page.waitForTimeout(5000);
  const share = await page.evaluate(() => ({
    strip: !!document.getElementById('chart-share-strip'),
    copyBtn: !!document.getElementById('copy-link-btn'),
    delegated: typeof window.APChartShare !== 'undefined',
  }));
  if (!share.strip && share.delegated) {
    // strip appears after save/calc — check result visible
    const hasResult = await page.evaluate(() => !!document.getElementById('result-name') || !!document.querySelector('.chart-result'));
    if (hasResult) bugs.push({ page: 'chart', type: 'missing', detail: 'share strip not created after calc' });
  }
  const filtered = errs.filter((e) => !/noaa|swpc/i.test(e));
  if (filtered.length) bugs.push({ page: 'chart-flow', type: 'console', detail: filtered });
  await page.close();
}

await browser.close();

if (!bugs.length) {
  console.log('BUG HUNT: no issues found');
  process.exit(0);
}
console.log('BUG HUNT: ' + bugs.length + ' issue(s)');
for (const b of bugs) console.log('  [' + b.page + '] ' + b.type + ': ' + (Array.isArray(b.detail) ? b.detail.join(' | ') : b.detail));
process.exit(1);