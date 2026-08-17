import { chromium } from './visual-check/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const out = join(process.cwd(), 'launch-output', 'score-look');
mkdirSync(out, { recursive: true });
const BASE = 'http://127.0.0.1:8790';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const notes = [];

async function shot(name) {
  const file = join(out, name + '.png');
  await page.screenshot({ path: file, fullPage: false });
  notes.push({ name, file, url: page.url() });
}

await page.goto(BASE + '/index.html?nosw=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(2500);
await shot('01-home');

await page.goto(BASE + '/chart.html?nosw=1&v=889', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(2500);
await shot('02-chart-form');
notes.push({
  name: '02-first-screen',
  ...(await page.evaluate(() => {
    const vh = window.innerHeight;
    const vis = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.height > 8 && r.bottom > 0 && r.top < vh - 8;
    };
    const form = document.getElementById('chart-form-wrapper');
    const sky = document.querySelector('.ap-room-sky');
    return {
      eclipseVisible: vis(document.querySelector('.chart-eclipse-strip')),
      keepVisible: vis(document.getElementById('keep-sky')),
      heroActionsVisible: vis(document.querySelector('.chart-hero__actions')),
      titleVisible: vis(document.querySelector('.chart-hero__title')),
      formVisible: vis(form),
      formTop: form ? Math.round(form.getBoundingClientRect().top) : null,
      skyH: sky ? Math.round(sky.getBoundingClientRect().height) : null,
      skyOverflow: sky ? getComputedStyle(sky).overflow : null,
    };
  })),
});

await page.click('button:has-text("Sample Chart")');
await page.waitForSelector('#natal-wheel svg .planet-glyph[data-planet="Sun"]', { timeout: 45000 });
await page.evaluate(() => document.getElementById('chart-result')?.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(500);
await shot('03-chart-result-top');
notes.push({
  name: '03-result-first-screen',
  ...(await page.evaluate(() => {
    const vh = window.innerHeight;
    const vis = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || el.hidden) return false;
      const r = el.getBoundingClientRect();
      return r.height > 8 && r.bottom > 40 && r.top < vh - 8;
    };
    return {
      nameVisible: vis(document.getElementById('result-name')),
      wheelVisible: vis(document.getElementById('natal-wheel')),
      sittingVisible: vis(document.getElementById('sitting-cta')),
      badgeVisible: vis(document.querySelector('.result-badge')),
      exportVisible: vis(document.getElementById('poster-btn')),
      moreOpen: !!document.querySelector('.chart-sitting-more[open]'),
      eclipseStripVisible: vis(document.querySelector('.chart-eclipse-strip')),
      wheelTop: Math.round(document.getElementById('natal-wheel')?.getBoundingClientRect().top || 0),
      sittingTop: Math.round(document.getElementById('sitting-cta')?.getBoundingClientRect().top || 0),
    };
  })),
});

await page.evaluate(() => document.getElementById('natal-wheel')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(400);
await shot('04-wheel-before-click');

await page.evaluate(() => {
  const sun = document.querySelector('#natal-wheel svg .planet-glyph[data-planet="Sun"]');
  sun?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
});
await page.waitForTimeout(500);
const after = await page.evaluate(() => {
  const panel = document.getElementById('chart-wheel-reading');
  const wheel = document.getElementById('natal-wheel');
  const wr = wheel?.getBoundingClientRect();
  const pr = panel?.getBoundingClientRect();
  return {
    panelHidden: panel?.hidden ?? null,
    title: document.getElementById('chart-wheel-reading-title')?.textContent || '',
    body: (document.getElementById('chart-wheel-reading-body')?.textContent || '').slice(0, 180),
    active: document.querySelectorAll('#natal-wheel svg .planet-glyph.is-active').length,
    dimmed: document.querySelectorAll('#natal-wheel svg .planet-glyph.is-dimmed').length,
    hasReadingClass: !!document.querySelector('.chart-wheel-card--has-reading'),
    wheelVisible: !!(wr && wr.bottom > 80 && wr.top < window.innerHeight - 40),
    panelVisible: !!(pr && !panel.hidden && pr.height > 40),
    bothInView: !!(wr && pr && !panel.hidden && wr.top < window.innerHeight && pr.bottom > 0 && wr.bottom > 0 && Math.min(wr.bottom, window.innerHeight) - Math.max(wr.top, 0) > 120),
  };
});
notes.push({ name: 'click-state', ...after });
await shot('05-wheel-after-sun-click');

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/chart.html?nosw=1&v=889', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(600);
await shot('06a-phone-form');
notes.push({
  name: '06a-phone-form',
  ...(await page.evaluate(() => {
    const vh = window.innerHeight;
    const vis = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none') return false;
      const r = el.getBoundingClientRect();
      return r.height > 8 && r.bottom > 0 && r.top < vh - 8;
    };
    const date = document.getElementById('date-input');
    return {
      formVisible: vis(document.getElementById('chart-form-wrapper')),
      dateVisible: vis(date),
      eclipseVisible: vis(document.querySelector('.chart-eclipse-strip')),
      keepVisible: vis(document.getElementById('keep-sky')),
      dateTop: date ? Math.round(date.getBoundingClientRect().top) : null,
      skyH: Math.round(document.querySelector('.ap-room-sky')?.getBoundingClientRect().height || 0),
    };
  })),
});
await page.click('button:has-text("Sample Chart")');
await page.waitForSelector('#natal-wheel svg', { timeout: 45000 });
await page.evaluate(() => document.getElementById('chart-result')?.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(600);
await shot('06-wheel-phone');
notes.push({
  name: '06-phone-result',
  ...(await page.evaluate(() => {
    const vh = window.innerHeight;
    const vis = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || el.hidden) return false;
      const r = el.getBoundingClientRect();
      return r.height > 8 && r.bottom > 40 && r.top < vh - 8;
    };
    return {
      wheelVisible: vis(document.getElementById('natal-wheel')),
      sittingVisible: vis(document.getElementById('sitting-cta')),
      badgeVisible: vis(document.querySelector('.result-badge')),
      exportVisible: vis(document.getElementById('poster-btn')),
      tabsVisible: vis(document.querySelector('.tabs-nav')),
    };
  })),
});

await page.goto(BASE + '/index.html?nosw=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(2500);
await shot('07-home-phone');

writeFileSync(join(out, 'notes.json'), JSON.stringify(notes, null, 2));
console.log(JSON.stringify(notes, null, 2));
await browser.close();
