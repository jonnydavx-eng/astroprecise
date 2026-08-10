/**
 * AstroPrecise v833 Living Sky release gate.
 * Proves one stable WebGL Observatory on desktop + phone, every labelled world
 * and scale, interruptible camera intent, merged legacy route, and shared shell.
 */
import { chromium } from './node_modules/playwright/index.mjs';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.env.AP_BASE || process.argv[2] || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const OUT = process.env.AP_VISUAL_OUT || 'C:\\tmp\\astroprecise-v833-visual';
const WINDOWS_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORLDS = ['Sun', 'Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'System'];
const SCALES = [
  ['EARTH', 0], ['SYSTEM', 2], ['STARS', 4], ['GALAXY', 5], ['COSMOS', 6],
];
const MOBILE_TABS = ['Live Sky', 'Chart', 'Daily', 'Shop'];
const failures = [];

function gate(name, condition, detail = '') {
  const ok = Boolean(condition);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}

function watch(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(`page: ${error.message || error}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function waitForModel(page) {
  await page.waitForSelector('#orr canvas', { state: 'visible', timeout: 35_000 });
  await page.waitForFunction(() => {
    const o = document.getElementById('orr');
    return o && o._ready === true && o.getAttribute('data-engine') === 'webgl' &&
      window.Orrery3D && typeof window.Orrery3D.getScaleLevel === 'function';
  }, null, { timeout: 35_000 });
  await page.waitForFunction(() => document.querySelector('.ap-model-stage')?.getAttribute('aria-busy') === 'false', null, { timeout: 6_000 });
  await page.waitForTimeout(100);
}

async function homeGate(browser, viewport, label, mobile) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = watch(page);
  await page.goto(`${BASE}/index.html?nosw=1&v833=${label}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForModel(page);

  const state = await page.evaluate(() => {
    const box = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
    };
    const dock = Array.from(document.querySelectorAll('#dock button')).map(button => ({
      name: button.dataset.name || button.textContent.trim(),
      text: button.textContent.trim(),
      box: box(button),
    }));
    const scales = Array.from(document.querySelectorAll('#mladder button')).map(button => button.dataset.lv || button.textContent.trim());
    return {
      engine: document.getElementById('orr')?.getAttribute('data-engine'),
      scale: window.Orrery3D?.getScaleLevel?.(),
      radius: window.Orrery3D?.getCamRadius?.(),
      modelCount: document.querySelectorAll('void-orrery').length,
      oldThreshold: Boolean(document.getElementById('explore-threshold')),
      oldDeck: Boolean(document.getElementById('orrery-lite-deck')),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      stage: box(document.querySelector('.ap-model-stage')),
      panel: box(document.querySelector('.ap-control-panel')),
      canvas: box(document.querySelector('#orr canvas')),
      dock,
      scales,
      cssLoaded: Array.from(document.styleSheets).some(sheet => String(sheet.href || '').includes('ap-living-sky-v833.css')),
      heading: document.querySelector('.ap-live-heading')?.textContent.trim(),
    };
  });

  gate(`${label} WebGL is the only model`, state.engine === 'webgl' && state.modelCount === 1, JSON.stringify({ engine: state.engine, count: state.modelCount }));
  gate(`${label} opens directly at System frame`, state.scale === 2 && Number(state.radius) >= 32 && Number(state.radius) <= 160, JSON.stringify({ scale: state.scale, radius: state.radius }));
  gate(`${label} retired doorway absent`, !state.oldThreshold && !state.oldDeck);
  gate(`${label} living-sky stylesheet loaded`, state.cssLoaded);
  gate(`${label} launch heading`, state.heading === 'The sky is alive.', state.heading || 'missing');
  gate(`${label} no horizontal overflow`, state.overflowX <= 1, `${state.overflowX}px`);
  gate(`${label} model has usable geometry`, state.stage && state.canvas && state.stage.width > 280 && state.stage.height > 340 && state.canvas.width > 280 && state.canvas.height > 340, JSON.stringify({ stage: state.stage, canvas: state.canvas }));
  if (mobile) {
    gate(`${label} controls sit below model`, state.panel && state.stage && state.panel.top >= state.stage.bottom - 2, JSON.stringify({ modelBottom: state.stage?.bottom, panelTop: state.panel?.top }));
  } else {
    gate(`${label} controls sit beside model`, state.panel && state.stage && state.panel.left >= state.stage.right - 2, JSON.stringify({ modelRight: state.stage?.right, panelLeft: state.panel?.left }));
  }
  gate(`${label} all worlds labelled`, JSON.stringify(state.dock.map(item => item.name)) === JSON.stringify(WORLDS), state.dock.map(item => item.name).join(', '));
  gate(`${label} all scales labelled`, state.scales.join(',') === SCALES.map(item => item[0]).join(','), state.scales.join(', '));
  if (mobile) {
    const minTarget = Math.min(...state.dock.map(item => item.box?.height || 0));
    gate(`${label} world controls are touch-sized`, minTarget >= 40, `${minTarget}px`);
  }

  for (const name of WORLDS) {
    await page.locator(`#dock button[data-name="${name}"]`).click();
    await page.waitForFunction(expected => document.getElementById('sky-focus-title')?.textContent.trim() === expected, name, { timeout: 3_000 });
  }
  gate(`${label} every world control is reachable`, true);

  for (const [name, expected] of SCALES) {
    await page.locator(`#mladder button[data-lv="${name}"]`).click();
    await page.waitForFunction(level => window.Orrery3D?.getScaleLevel?.() === level, expected, { timeout: 3_000 });
  }
  gate(`${label} every scale is reachable`, true);

  await page.locator('#mladder button[data-lv="SYSTEM"]').click();
  await page.waitForTimeout(100);
  await page.locator('#dock button[data-name="Mars"]').click();
  await page.waitForTimeout(140);
  await page.locator('#dock button[data-name="Jupiter"]').click();
  const samples = [];
  for (let i = 0; i < 12; i++) {
    samples.push(await page.evaluate(() => ({
      level: window.Orrery3D?.getScaleLevel?.(),
      radius: window.Orrery3D?.getCamRadius?.(),
      title: document.getElementById('sky-focus-title')?.textContent.trim(),
      journey: window.Orrery3D?.isJourneyActive?.(),
    })));
    await page.waitForTimeout(120);
  }
  const finite = samples.every(sample => Number.isFinite(sample.radius));
  const noEarthJump = samples.every(sample => sample.level !== 0);
  const final = samples.at(-1);
  gate(`${label} interrupted planet flight keeps latest intent`, final?.title === 'Jupiter' && finite && noEarthJump, JSON.stringify(samples));
  gate(`${label} no automatic tour owns the camera`, samples.every(sample => !sample.journey));

  if (mobile) {
    const toggle = page.locator('.navbar__toggle');
    gate(`${label} mobile menu control visible`, await toggle.isVisible());
    await toggle.click();
    gate(`${label} mobile menu opens`, await page.locator('#nav-mobile-menu.open').isVisible());
    await toggle.click();
  }

  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: join(OUT, `home-${label}.png`), fullPage: false });
  gate(`${label} no runtime errors`, errors.length === 0, errors.slice(0, 5).join(' | '));
  await context.close();
}

async function deepLinkGate(browser) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = watch(page);
  const iso = '2020-06-14T12:00:00.000Z';
  await page.goto(`${BASE}/index.html?nosw=1#m=${encodeURIComponent(iso)}&focus=mars`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForModel(page);
  const direct = await page.evaluate(() => ({
    title: document.getElementById('sky-focus-title')?.textContent.trim(),
    live: document.getElementById('sky-live-status')?.textContent.trim(),
    hash: location.hash,
    skyPeriod: document.body.dataset.skyPeriod || null,
    stageBusy: document.querySelector('.ap-model-stage')?.getAttribute('aria-busy'),
    controllerLoaded: Array.from(document.scripts).some(script => String(script.src || '').includes('ap-observatory-v833.js')),
    elementReady: document.getElementById('orr')?._ready === true,
  }));
  gate('direct Observatory deep link applies time + focus', direct.title === 'Mars' && direct.live === 'Selected moment', JSON.stringify(direct));

  await page.goto(`${BASE}/explore.html?nosw=1#m=${encodeURIComponent(iso)}&focus=jupiter&scale=2`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForURL(url => url.pathname.endsWith('/index.html') && url.hash.includes('focus=jupiter'), { timeout: 10_000 });
  await waitForModel(page);
  const merged = await page.evaluate(() => ({
    path: location.pathname,
    hash: location.hash,
    title: document.getElementById('sky-focus-title')?.textContent.trim(),
  }));
  gate('legacy Explore route merges into Observatory', merged.path.endsWith('/index.html') && merged.title === 'Jupiter' && merged.hash.includes('m='), JSON.stringify(merged));
  gate('deep-link routes have no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await page.close();
}

async function routeGate(browser) {
  const routes = [
    ['chart.html', 'page-chart'],
    ['horoscope.html', 'page-horoscope'],
    ['eclipse.html', 'page-eclipse'],
    ['shop.html', 'page-shop'],
  ];
  for (const [route, bodyClass] of routes) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = watch(page);
    await page.goto(`${BASE}/${route}?nosw=1&v833=route`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('h1', { state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(1600);
    const state = await page.evaluate(expected => ({
      body: document.body.classList.contains(expected),
      css: Array.from(document.styleSheets).some(sheet => String(sheet.href || '').includes('ap-living-sky-v833.css')),
      nav: Boolean(document.querySelector('.site-header')),
      h1: document.querySelector('h1')?.textContent.trim(),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }), bodyClass);
    gate(`${route} shared launch shell`, state.body && state.css && state.nav && Boolean(state.h1), JSON.stringify(state));
    gate(`${route} phone has no horizontal overflow`, state.overflowX <= 1, `${state.overflowX}px`);
    gate(`${route} has no runtime errors`, errors.length === 0, errors.slice(0, 5).join(' | '));
    await page.screenshot({ path: join(OUT, `route-${route.replace('.html', '')}-phone.png`), fullPage: false });
    await page.close();
  }
}

async function bottomNavGate(browser) {
  const routes = [
    ['index.html', 'Live Sky'],
    ['chart.html', 'Chart'],
    ['horoscope.html', 'Daily'],
    ['eclipse.html', null],
    ['shop.html', 'Shop'],
  ];
  for (const [route, expectedActive] of routes) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = watch(page);
    await page.goto(BASE + '/' + route + '?nosw=1&v833=bottom-nav', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('.bottom-nav', { state: 'visible', timeout: 15_000 });
    const state = await page.evaluate(() => {
      const nav = document.querySelector('.bottom-nav');
      const links = Array.from(nav?.querySelectorAll('.bottom-nav__item') || []);
      const active = links.find(link => link.matches('.is-active, [aria-current="page"]'));
      const box = nav?.getBoundingClientRect();
      return {
        labels: links.map(link => link.querySelector('.bottom-nav__label')?.textContent.trim()),
        active: active?.querySelector('.bottom-nav__label')?.textContent.trim() || null,
        iconCount: links.filter(link => link.querySelector('.bottom-nav__svg')).length,
        visible: Boolean(box && box.height >= 60 && getComputedStyle(nav).display !== 'none'),
        navHeight: box?.height || 0,
        bodyPaddingBottom: parseFloat(getComputedStyle(document.body).paddingBottom) || 0,
        minTarget: links.length ? Math.min(...links.map(link => link.getBoundingClientRect().height)) : 0,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    gate(route + ' uses the shared four-tab navigation', JSON.stringify(state.labels) === JSON.stringify(MOBILE_TABS) && state.active === expectedActive, JSON.stringify(state));
    gate(route + ' bottom navigation is visible and touch-sized', state.visible && state.iconCount === 4 && state.minTarget >= 44, JSON.stringify(state));
    gate(route + ' content clears the fixed bottom navigation', state.bodyPaddingBottom + 1 >= state.navHeight, JSON.stringify(state));
    gate(route + ' bottom navigation does not add overflow', state.overflowX <= 1, state.overflowX + 'px');
    gate(route + ' bottom navigation has no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
    await page.close();
  }
}

async function planetReturnGate(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = watch(page);
  await page.goto(BASE + '/index.html?nosw=1&v833=planet-return', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForModel(page);
  const jupiter = page.locator('#dock button[data-name="Jupiter"]');
  await jupiter.scrollIntoViewIfNeeded();
  await jupiter.click();
  await page.waitForFunction(() => document.getElementById('sky-focus-title')?.textContent.trim() === 'Jupiter', null, { timeout: 3_000 });
  await page.waitForTimeout(1400);
  const state = await page.evaluate(() => {
    const stage = document.querySelector('.ap-model-stage')?.getBoundingClientRect();
    const header = document.querySelector('.site-header')?.getBoundingClientRect();
    return {
      title: document.getElementById('sky-focus-title')?.textContent.trim(),
      engine: document.getElementById('orr')?.getAttribute('data-engine'),
      stageTop: stage?.top,
      stageBottom: stage?.bottom,
      headerBottom: header?.bottom || 0,
      viewportHeight: innerHeight,
      visible: Boolean(stage && stage.bottom > (header?.bottom || 0) + 120 && stage.top < innerHeight * 0.34),
    };
  });
  gate('phone planet choice returns the live model to view', state.title === 'Jupiter' && state.engine === 'webgl' && state.visible, JSON.stringify(state));
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: join(OUT, 'home-phone-jupiter.png'), fullPage: false });
  gate('phone planet-return path has no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await context.close();
}

const launch = { headless: true, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] };
if (existsSync(WINDOWS_CHROME)) launch.executablePath = WINDOWS_CHROME;
const browser = await chromium.launch(launch);
try {
  await homeGate(browser, { width: 1440, height: 900 }, 'desktop', false);
  await homeGate(browser, { width: 390, height: 844 }, 'phone', true);
  await deepLinkGate(browser);
  await routeGate(browser);
  await bottomNavGate(browser);
  await planetReturnGate(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} v833 gate(s) failed:`);
  failures.forEach(failure => console.error(` - ${failure}`));
  process.exit(1);
}
console.log(`\nALL V833 LIVING SKY GATES PASS · screenshots: ${OUT}`);