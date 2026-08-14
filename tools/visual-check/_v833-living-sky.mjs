/**
 * AstroPrecise Act 1 launch contract.
 *
 * The legacy filename is retained because package.json calls it directly. The
 * assertions below describe the current product: one immersive WebGL
 * Observatory, edge controls on desktop, dedicated phone selectors, the
 * four-route launch drawer, and truthful event / eclipse / shop surfaces.
 */
import { chromium } from './node_modules/playwright/index.mjs';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.env.AP_BASE || process.argv[2] || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const OUT = process.env.AP_VISUAL_OUT || '/tmp/astroprecise-act1-visual';
const WINDOWS_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORLDS = ['System', 'Sun', 'Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
const SCALES = [
  ['EARTH', 0], ['INNER', 1], ['SYSTEM', 2], ['OORT', 3],
  ['STARS', 4], ['GALAXY', 5], ['COSMOS', 6],
];
const PRIMARY_ROUTES = [
  ['index.html', 'Observatory'],
  ['chart.html', 'Chart'],
  ['sky-events.html', 'Events'],
  ['shop.html', 'Shop'],
];
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
    const orrery = document.getElementById('orr');
    const canvas = orrery?.querySelector('canvas');
    return orrery?._ready === true && orrery.getAttribute('data-engine') === 'webgl' &&
      canvas && getComputedStyle(canvas).visibility === 'visible' &&
      window.Orrery3D && typeof window.Orrery3D.getScaleLevel === 'function';
  }, null, { timeout: 35_000 });
  await page.waitForFunction(() => document.querySelector('.ap-model-stage')?.getAttribute('aria-busy') === 'false', null, { timeout: 6_000 });
  await page.waitForTimeout(100);
}

async function selectWorld(page, name, mobile) {
  if (mobile) {
    const value = name === 'System' ? '' : name.toLowerCase();
    await page.locator('#mobileWorld').selectOption(value);
  } else {
    await page.locator(`#dock button[data-name="${name}"]`).click();
  }
  const accepted = name === 'System' ? ['Solar system', 'The System'] : [name];
  await page.waitForFunction(names => names.includes(document.getElementById('sky-focus-title')?.textContent.trim()), accepted, { timeout: 4_000 });
}

async function selectScale(page, name, expected, mobile) {
  if (mobile) await page.locator('#mobileScale').selectOption(name);
  else await page.locator(`#mladder button[data-lv="${name}"]`).click();
  await page.waitForFunction(level => window.Orrery3D?.getScaleLevel?.() === level, expected, { timeout: 4_000 });
  await page.waitForFunction(label => document.getElementById('sky-scale-status')?.textContent.trim() === label,
    name === 'SYSTEM' ? 'Solar system' : ({ EARTH: 'Earth', INNER: 'Inner system', OORT: 'Oort cloud', STARS: 'Nearby stars', GALAXY: 'Galaxy', COSMOS: 'Cosmos' })[name],
    { timeout: 4_000 });
}

async function homeGate(browser, viewport, label, mobile) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = watch(page);
  await page.goto(`${BASE}/index.html?nosw=1&contract=act1-${label}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForModel(page);

  const state = await page.evaluate(() => {
    const box = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
    };
    const dock = Array.from(document.querySelectorAll('#dock button')).map(button => button.dataset.name || button.textContent.trim());
    const scales = Array.from(document.querySelectorAll('#mladder button')).map(button => button.dataset.lv || button.textContent.trim());
    const worldSelect = document.getElementById('mobileWorld');
    const scaleSelect = document.getElementById('mobileScale');
    const canvas = document.querySelector('#orr canvas');
    return {
      engine: document.getElementById('orr')?.getAttribute('data-engine'),
      scale: window.Orrery3D?.getScaleLevel?.(),
      radius: window.Orrery3D?.getCamRadius?.(),
      modelCount: document.querySelectorAll('void-orrery').length,
      visibleCanvasCount: Array.from(document.querySelectorAll('#orr canvas')).filter(item => {
        const style = getComputedStyle(item);
        const rect = item.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).length,
      oldThreshold: Boolean(document.getElementById('explore-threshold')),
      oldDeck: Boolean(document.getElementById('orrery-lite-deck')),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      stage: box(document.querySelector('.ap-model-stage')),
      flightDeck: box(document.querySelector('.ap-mobile-flight-deck')),
      panel: box(document.querySelector('.ap-control-panel')),
      canvas: box(canvas),
      canvasPointerEvents: canvas ? getComputedStyle(canvas).pointerEvents : null,
      dock,
      scales,
      worldSelect: { disabled: worldSelect?.disabled, box: box(worldSelect) },
      scaleSelect: { disabled: scaleSelect?.disabled, box: box(scaleSelect) },
      cssLoaded: Array.from(document.styleSheets).some(sheet => String(sheet.href || '').includes('ap-living-sky-v834.css')),
      heading: document.querySelector('.ap-live-heading')?.textContent.trim(),
    };
  });

  gate(`${label} WebGL is the only model`, state.engine === 'webgl' && state.modelCount === 1 && state.visibleCanvasCount === 1, JSON.stringify({ engine: state.engine, modelCount: state.modelCount, visibleCanvasCount: state.visibleCanvasCount }));
  gate(`${label} opens directly at System frame`, state.scale === 2 && Number(state.radius) >= 32 && Number(state.radius) <= 160, JSON.stringify({ scale: state.scale, radius: state.radius }));
  gate(`${label} retired doorway absent`, !state.oldThreshold && !state.oldDeck);
  gate(`${label} living-sky stylesheet loaded`, state.cssLoaded);
  gate(`${label} launch heading`, state.heading === 'The sky is moving.', state.heading || 'missing');
  gate(`${label} no horizontal overflow`, state.overflowX <= 1, `${state.overflowX}px`);
  gate(`${label} model has usable geometry`, state.stage && state.canvas && state.stage.width > 280 && state.stage.height > 340 && state.canvas.width > 280 && state.canvas.height > 340, JSON.stringify({ stage: state.stage, canvas: state.canvas }));
  gate(`${label} model remains directly interactive`, state.canvasPointerEvents !== 'none', String(state.canvasPointerEvents));
  if (mobile) {
    gate(`${label} model, flight deck and reading panel are ordered`, state.stage && state.flightDeck && state.panel && state.flightDeck.top >= state.stage.bottom - 2 && state.panel.top >= state.flightDeck.bottom - 2, JSON.stringify({ stageBottom: state.stage?.bottom, deckTop: state.flightDeck?.top, deckBottom: state.flightDeck?.bottom, panelTop: state.panel?.top }));
    const targetSizes = [state.worldSelect.box?.height || 0, state.scaleSelect.box?.height || 0];
    gate(`${label} flight selectors are enabled and touch-sized`, !state.worldSelect.disabled && !state.scaleSelect.disabled && Math.min(...targetSizes) >= 44, JSON.stringify({ targetSizes, worldDisabled: state.worldSelect.disabled, scaleDisabled: state.scaleSelect.disabled }));
  } else {
    gate(`${label} control panel sits inside the model's right edge`, state.panel && state.stage && state.panel.left > state.stage.left + state.stage.width * 0.55 && state.panel.right <= state.stage.right + 2 && state.panel.height > 300, JSON.stringify({ stage: state.stage, panel: state.panel }));
  }
  gate(`${label} all current worlds labelled`, JSON.stringify(state.dock) === JSON.stringify(WORLDS), state.dock.join(', '));
  gate(`${label} all seven scales labelled`, state.scales.join(',') === SCALES.map(item => item[0]).join(','), state.scales.join(', '));

  if (mobile) {
    await selectWorld(page, 'Jupiter', true);
    await selectWorld(page, 'Earth', true);
    await page.waitForFunction(() => document.getElementById('sky-scale-status')?.textContent.trim() === 'Earth', null, { timeout: 4_000 });
    gate(`${label} mobile destination selector updates focus and Earth status`, true);
    for (const [name, expected] of SCALES) await selectScale(page, name, expected, true);
    gate(`${label} every mobile scale is reachable`, true);
  } else {
    for (const name of WORLDS) await selectWorld(page, name, false);
    await selectWorld(page, 'Earth', false);
    await page.waitForFunction(() => document.getElementById('sky-scale-status')?.textContent.trim() === 'Earth', null, { timeout: 4_000 });
    gate(`${label} every world control is reachable with correct Earth status`, true);
    for (const [name, expected] of SCALES) await selectScale(page, name, expected, false);
    gate(`${label} every scale is reachable`, true);

    await selectScale(page, 'SYSTEM', 2, false);
    await selectWorld(page, 'Mars', false);
    await page.waitForTimeout(140);
    await selectWorld(page, 'Jupiter', false);
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
    const final = samples.at(-1);
    gate(`${label} interrupted planet flight keeps latest intent`, final?.title === 'Jupiter' && samples.every(sample => Number.isFinite(sample.radius) && sample.level !== 0), JSON.stringify(samples));
    gate(`${label} no automatic tour owns the camera`, samples.every(sample => !sample.journey));
  }

  if (mobile) {
    const toggle = page.locator('.navbar__toggle');
    gate(`${label} mobile menu control visible`, await toggle.isVisible());
    await toggle.click();
    gate(`${label} mobile menu opens`, await page.locator('#nav-mobile-menu.open').isVisible());
    await page.keyboard.press('Escape');
    gate(`${label} Escape closes mobile menu`, !(await page.locator('#nav-mobile-menu').evaluate(element => element.classList.contains('open'))));
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
    stageBusy: document.querySelector('.ap-model-stage')?.getAttribute('aria-busy'),
    elementReady: document.getElementById('orr')?._ready === true,
  }));
  gate('direct Observatory deep link applies time + focus', direct.title === 'Mars' && direct.live === 'Selected moment' && direct.stageBusy === 'false' && direct.elementReady, JSON.stringify(direct));

  await page.goto(`${BASE}/explore.html?nosw=1#m=${encodeURIComponent(iso)}&focus=jupiter&scale=2`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForURL(url => url.pathname.endsWith('/index.html') && url.hash.includes('focus=jupiter'), { timeout: 10_000 });
  await waitForModel(page);
  const merged = await page.evaluate(() => ({ path: location.pathname, hash: location.hash, title: document.getElementById('sky-focus-title')?.textContent.trim() }));
  gate('legacy Explore route merges into Observatory', merged.path.endsWith('/index.html') && merged.title === 'Jupiter' && merged.hash.includes('m='), JSON.stringify(merged));
  gate('deep-link routes have no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await page.close();
}

async function routeGate(browser) {
  const routes = [
    ['chart.html', 'page-chart'],
    ['horoscope.html', 'page-horoscope'],
    ['sky-events.html', 'page-sky-events'],
    ['eclipse.html', 'page-eclipse'],
    ['shop.html', 'page-shop'],
  ];
  for (const [route, bodyClass] of routes) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = watch(page);
    const response = await page.goto(`${BASE}/${route}?nosw=1&contract=act1-route`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('h1', { state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(1600);
    const state = await page.evaluate(expected => ({
      body: document.body.classList.contains(expected),
      css: Array.from(document.styleSheets).some(sheet => String(sheet.href || '').includes('ap-living-sky-v834.css')),
      nav: Boolean(document.querySelector('.site-header')),
      h1: document.querySelector('h1')?.textContent.trim(),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }), bodyClass);
    gate(`${route} returns 2xx with shared launch shell`, response?.ok() && state.body && state.css && state.nav && Boolean(state.h1), JSON.stringify({ status: response?.status(), ...state }));
    gate(`${route} phone has no horizontal overflow`, state.overflowX <= 1, `${state.overflowX}px`);

    if (route === 'sky-events.html') {
      await page.waitForSelector('#perseids', { timeout: 8_000 });
      await page.waitForSelector('#lunar-eclipse', { timeout: 8_000 });
      gate('Events renders Perseids and the 28 August lunar eclipse', true);
    }
    if (route === 'eclipse.html') {
      const eclipse = await page.evaluate(() => ({
        canvasCount: document.querySelectorAll('.ap-eclipse-live__canvas').length,
        guide: Boolean(document.querySelector('.ap-eclipse-guide__download[href$=".pdf"]')),
        controls: Boolean(document.querySelector('[data-eclipse-play]') && document.querySelector('[data-eclipse-lens="earth"]')),
      }));
      gate('Eclipse owns one dedicated 3D canvas, controls and free guide', eclipse.canvasCount === 1 && eclipse.guide && eclipse.controls, JSON.stringify(eclipse));
    }
    if (route === 'shop.html') {
      const shop = await page.evaluate(() => ({
        freeGuide: Boolean(document.getElementById('eclipse-field-guide')),
        paidEditionCount: document.querySelectorAll('#eclipse-edition').length,
        price: document.getElementById('eclipse-edition')?.textContent.includes('£7'),
        gumroad: Boolean(document.querySelector('a[href*="gumroad.com/l/your-eclipse-reading"]')),
      }));
      gate('Shop presents the free guide and one truthful £7 edition', shop.freeGuide && shop.paidEditionCount === 1 && shop.price && shop.gumroad, JSON.stringify(shop));
    }

    gate(`${route} has no runtime errors`, errors.length === 0, errors.slice(0, 5).join(' | '));
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: join(OUT, `route-${route.replace('.html', '')}-phone.png`), fullPage: false });
    await page.close();
  }
}

async function mobileNavGate(browser) {
  for (const [route, expectedActive] of PRIMARY_ROUTES) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = watch(page);
    await page.goto(`${BASE}/${route}?nosw=1&contract=act1-nav`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('.navbar__toggle', { state: 'visible', timeout: 15_000 });
    const bottomHidden = await page.locator('.bottom-nav').evaluate(nav => getComputedStyle(nav).display === 'none');
    gate(`${route} retired fixed bottom bar stays hidden`, bottomHidden);
    await page.locator('.navbar__toggle').click();
    await page.waitForSelector('#nav-mobile-menu.open', { state: 'visible', timeout: 4_000 });
    const state = await page.evaluate(() => {
      const menu = document.getElementById('nav-mobile-menu');
      const links = Array.from(menu?.querySelectorAll('a.navbar__link') || []);
      return {
        labels: links.map(link => link.textContent.replace(/\s+Live\s*$/, '').trim()),
        hrefs: links.map(link => link.getAttribute('href')),
        active: links.find(link => link.getAttribute('aria-current') === 'page')?.textContent.replace(/\s+Live\s*$/, '').trim() || null,
        minTarget: links.length ? Math.min(...links.map(link => link.getBoundingClientRect().height)) : 0,
      };
    });
    gate(`${route} mobile drawer exposes the four-route spine`, JSON.stringify(state.labels) === JSON.stringify(PRIMARY_ROUTES.map(item => item[1])) && JSON.stringify(state.hrefs) === JSON.stringify(PRIMARY_ROUTES.map(item => item[0])) && state.active === expectedActive, JSON.stringify(state));
    gate(`${route} mobile drawer targets are touch-sized`, state.minTarget >= 44, `${state.minTarget}px`);
    await page.keyboard.press('Escape');
    gate(`${route} Escape closes the drawer`, !(await page.locator('#nav-mobile-menu').evaluate(element => element.classList.contains('open'))));
    gate(`${route} mobile navigation has no runtime errors`, errors.length === 0, errors.slice(0, 5).join(' | '));
    await page.close();
  }
}

async function planetReturnGate(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = watch(page);
  await page.goto(`${BASE}/index.html?nosw=1&contract=act1-planet-return`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForModel(page);
  await page.locator('#mobileWorld').selectOption('jupiter');
  await page.waitForFunction(() => document.getElementById('sky-focus-title')?.textContent.trim() === 'Jupiter', null, { timeout: 4_000 });
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
  await mobileNavGate(browser);
  await planetReturnGate(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} Act 1 launch gate(s) failed:`);
  failures.forEach(failure => console.error(` - ${failure}`));
  process.exit(1);
}
console.log(`\nALL ACT 1 LAUNCH GATES PASS · screenshots: ${OUT}`);
