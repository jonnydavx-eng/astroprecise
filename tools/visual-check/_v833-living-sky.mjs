/**
 * AstroPrecise v900 flagship UI contract.
 *
 * The legacy filename is retained because package.json calls it directly. The
 * contract is current: one live WebGL Observatory on the home route, authored
 * Surface A stills everywhere else, an aspect-aware complete-Earth frame, and
 * no product checkout presented as live.
 */
import { chromium } from './node_modules/playwright/index.mjs';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const BASE = (process.env.AP_BASE || process.argv[2] || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const OUT = process.env.AP_VISUAL_OUT || join(tmpdir(), 'astroprecise-v900-ui');
const WINDOWS_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
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

async function waitForObservatory(page) {
  await page.waitForSelector('#orr canvas', { state: 'visible', timeout: 35_000 });
  await page.waitForFunction(() => {
    const model = document.getElementById('orr');
    return model?._ready === true && model.getAttribute('data-engine') === 'webgl' &&
      document.querySelector('.ap-model-stage')?.getAttribute('aria-busy') === 'false' &&
      window.Orrery3D && typeof window.Orrery3D.getCamRadius === 'function';
  }, null, { timeout: 35_000 });
  await page.waitForTimeout(900);
}

async function homeGate(browser, viewport, label, mobile) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = watch(page);
  const response = await page.goto(`${BASE}/index.html?nosw=1&contract=v900-${label}`, {
    waitUntil: 'domcontentloaded', timeout: 60_000,
  });
  await waitForObservatory(page);

  const state = await page.evaluate(() => {
    const box = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
    };
    const visible = element => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const canvas = document.querySelector('#orr canvas');
    const cta = document.querySelector('.ap-live-intro .ap-action--primary');
    return {
      modelCount: document.querySelectorAll('void-orrery').length,
      canvasCount: Array.from(document.querySelectorAll('canvas')).filter(visible).length,
      engine: document.getElementById('orr')?.getAttribute('data-engine'),
      busy: document.querySelector('.ap-model-stage')?.getAttribute('aria-busy'),
      focus: document.getElementById('sky-focus-title')?.textContent.trim(),
      scale: window.Orrery3D?.getScaleLevel?.(),
      radius: window.Orrery3D?.getCamRadius?.(),
      heading: document.querySelector('.ap-live-heading')?.textContent.trim(),
      stage: box(document.querySelector('.ap-model-stage')),
      canvas: box(canvas),
      intro: box(document.querySelector('.ap-live-intro')),
      cta: box(cta),
      ctaVisible: visible(cta),
      pointerEvents: canvas ? getComputedStyle(canvas).pointerEvents : null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      panelVisible: visible(document.querySelector('.ap-control-panel')),
      flightDeckVisible: visible(document.querySelector('.ap-mobile-flight-deck')),
    };
  });

  gate(`${label} route returns successfully`, response?.ok(), String(response?.status()));
  gate(`${label} owns exactly one live WebGL model`, state.modelCount === 1 && state.canvasCount === 1 && state.engine === 'webgl', JSON.stringify({ models: state.modelCount, canvases: state.canvasCount, engine: state.engine }));
  gate(`${label} opens on Earth without a dashboard detour`, state.focus === 'Earth' && state.scale === 0, JSON.stringify({ focus: state.focus, scale: state.scale }));
  const radiusOk = mobile
    ? Number(state.radius) >= 12 && Number(state.radius) <= 16
    : Number(state.radius) >= 5 && Number(state.radius) <= 8;
  gate(`${label} complete-Earth camera uses the aspect-aware distance`, radiusOk, String(state.radius));
  gate(`${label} model fills the viewport without overflow`, state.stage && state.canvas && state.stage.width >= viewport.width - 1 && state.stage.height >= viewport.height - 1 && state.canvas.width >= viewport.width - 1 && state.canvas.height >= viewport.height - 1 && state.overflowX <= 1, JSON.stringify({ stage: state.stage, canvas: state.canvas, overflowX: state.overflowX }));
  gate(`${label} flagship promise and CTA are visible`, state.heading === 'Sit with the sky first' && state.ctaVisible && state.cta?.height >= 44 && state.intro, JSON.stringify({ heading: state.heading, cta: state.cta, intro: state.intro }));
  gate(`${label} live model remains directly interactive`, state.busy === 'false' && state.pointerEvents !== 'none', JSON.stringify({ busy: state.busy, pointerEvents: state.pointerEvents }));
  gate(`${label} retired dashboard controls stay out of the reading-room composition`, !state.panelVisible && !state.flightDeckVisible);

  if (mobile) {
    const toggle = page.locator('.navbar__toggle');
    const toggleBox = await toggle.boundingBox();
    gate('phone navigation control is visible and touch-sized', await toggle.isVisible() && toggleBox?.height >= 44, JSON.stringify(toggleBox));
    await toggle.click();
    const menu = page.locator('#nav-mobile-menu.open');
    await menu.waitFor({ state: 'visible', timeout: 4_000 });
    const navState = await menu.evaluate(element => {
      const links = Array.from(element.querySelectorAll('a.navbar__link'));
      return {
        labels: links.map(link => link.textContent.replace(/\s+Live\s*$/, '').trim()),
        minTarget: links.length ? Math.min(...links.map(link => link.getBoundingClientRect().height)) : 0,
      };
    });
    gate('phone drawer exposes the four-route spine', JSON.stringify(navState.labels) === JSON.stringify(['Observatory', 'Chart', 'Events', 'Shop']), JSON.stringify(navState));
    gate('phone drawer targets are touch-sized', navState.minTarget >= 44, `${navState.minTarget}px`);
    await page.keyboard.press('Escape');
    gate('Escape closes the phone drawer', !(await page.locator('#nav-mobile-menu').evaluate(element => element.classList.contains('open'))));
  }

  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: join(OUT, `home-${label}.png`), fullPage: false });
  gate(`${label} has no runtime errors`, errors.length === 0, errors.slice(0, 5).join(' | '));
  await context.close();
}

async function responsiveResizeGate(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = watch(page);
  await page.goto(`${BASE}/index.html?nosw=1&contract=v900-live-resize`, {
    waitUntil: 'domcontentloaded', timeout: 60_000,
  });
  await waitForObservatory(page);
  const desktopRadius = await page.evaluate(() => window.Orrery3D?.getCamRadius?.());

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => Number(window.Orrery3D?.getCamRadius?.()) >= 12, null, { timeout: 8_000 });
  await page.waitForTimeout(250);
  const phoneState = await page.evaluate(() => ({
    radius: window.Orrery3D?.getCamRadius?.(),
    canvasWidth: document.querySelector('#orr canvas')?.getBoundingClientRect().width,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForFunction(() => Number(window.Orrery3D?.getCamRadius?.()) < 8, null, { timeout: 8_000 });
  const restoredRadius = await page.evaluate(() => window.Orrery3D?.getCamRadius?.());

  gate('live desktop-to-phone resize refits the complete Earth', Number(desktopRadius) >= 5 && Number(desktopRadius) <= 8 && Number(phoneState.radius) >= 12 && Number(phoneState.radius) <= 16, JSON.stringify({ desktopRadius, phoneState }));
  gate('live phone resize keeps the canvas fitted without overflow', Number(phoneState.canvasWidth) >= 389 && Number(phoneState.overflowX) <= 1, JSON.stringify(phoneState));
  gate('live phone-to-desktop resize restores the desktop frame', Number(restoredRadius) >= 5 && Number(restoredRadius) <= 8, String(restoredRadius));
  gate('live responsive resize has no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await page.close();
}

async function deepLinkGate(browser) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = watch(page);
  const iso = '2020-06-14T12:00:00.000Z';
  await page.goto(`${BASE}/index.html?nosw=1#m=${encodeURIComponent(iso)}&public=1&name=Alice&dob=1994-03-14&city=Leeds&focus=mars`, {
    waitUntil: 'domcontentloaded', timeout: 60_000,
  });
  await waitForObservatory(page);
  await page.waitForFunction(() => document.getElementById('sky-focus-title')?.textContent.trim() === 'Mars', null, { timeout: 8_000 });
  const state = await page.evaluate(() => ({
    title: document.getElementById('sky-focus-title')?.textContent.trim(),
    live: document.getElementById('sky-live-status')?.textContent.trim(),
    hash: location.hash,
    canvases: document.querySelectorAll('#orr canvas').length,
  }));
  gate('marked public deep link opens the requested event moment and strips unrelated fields',
    state.title === 'Mars' && state.live === 'Selected moment' && state.hash.includes('m=') &&
      state.hash.includes('public=1') && !/name|dob|city|Alice|1994|Leeds/i.test(state.hash) && state.canvases === 1,
    JSON.stringify(state));
  gate('deep-linked Observatory has no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await page.close();

  const legacyPage = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const legacyErrors = watch(legacyPage);
  await legacyPage.goto(`${BASE}/index.html?nosw=1#m=now&M=${encodeURIComponent('1994-03-14T09:12:00.000Z')}&focus=mars`, {
    waitUntil: 'domcontentloaded', timeout: 60_000,
  });
  await waitForObservatory(legacyPage);
  await legacyPage.waitForFunction(() => document.getElementById('sky-live-status')?.textContent.trim() === 'Live now', null, { timeout: 8_000 });
  const legacyState = await legacyPage.evaluate(() => ({
    live: document.getElementById('sky-live-status')?.textContent.trim(),
    focus: document.getElementById('sky-focus-title')?.textContent.trim(),
    hash: location.hash,
  }));
  gate('duplicate/case-varied historical moment fails closed before the Observatory boots',
    legacyState.live === 'Live now' && legacyState.focus === 'Mars' && legacyState.hash === '#focus=mars',
    JSON.stringify(legacyState));
  await legacyPage.evaluate(() => {
    location.hash = 'm=1994-03-14T09%3A12%3A00.000Z&focus=venus';
  });
  await legacyPage.waitForFunction(() => location.hash === '#focus=venus' &&
    document.getElementById('sky-focus-title')?.textContent.trim() === 'Venus' &&
    document.getElementById('sky-live-status')?.textContent.trim() === 'Live now', null, { timeout: 8_000 });
  const liveScrub = await legacyPage.evaluate(() => ({
    live: document.getElementById('sky-live-status')?.textContent.trim(),
    focus: document.getElementById('sky-focus-title')?.textContent.trim(),
    hash: location.hash,
  }));
  gate('same-document unmarked fixed moment is scrubbed by the live receiver',
    liveScrub.live === 'Live now' && liveScrub.focus === 'Venus' && liveScrub.hash === '#focus=venus',
    JSON.stringify(liveScrub));
  await legacyPage.evaluate(() => {
    location.hash = 'm=now&name=Alice&dob=1994-03-14&city=Leeds&focus=moon';
  });
  await legacyPage.waitForFunction(() => location.hash === '#m=now&focus=moon' &&
    document.getElementById('sky-focus-title')?.textContent.trim() === 'Moon' &&
    document.getElementById('sky-live-status')?.textContent.trim() === 'Live now', null, { timeout: 8_000 });
  const canonicalNow = await legacyPage.evaluate(() => ({
    live: document.getElementById('sky-live-status')?.textContent.trim(),
    focus: document.getElementById('sky-focus-title')?.textContent.trim(),
    hash: location.hash,
  }));
  gate('same-document live-now moment retains only canonical public controls',
    canonicalNow.live === 'Live now' && canonicalNow.focus === 'Moon' && canonicalNow.hash === '#m=now&focus=moon',
    JSON.stringify(canonicalNow));
  gate('legacy fixed-moment migration has no runtime errors', legacyErrors.length === 0, legacyErrors.slice(0, 5).join(' | '));
  await legacyPage.close();
}

async function stalePrivateStashGate(browser) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await context.addInitScript(() => {
    sessionStorage.setItem('ap-explore-moment', JSON.stringify({
      m: '1994-03-14T09:12:00.000Z', focus: 'mars', scale: 'SYSTEM'
    }));
  });
  const page = await context.newPage();
  const errors = watch(page);
  await page.goto(`${BASE}/index.html?nosw=1`, {
    waitUntil: 'domcontentloaded', timeout: 60_000,
  });
  await waitForObservatory(page);
  await page.waitForFunction(() => document.getElementById('sky-live-status')?.textContent.trim() === 'Live now', null, { timeout: 8_000 });
  const state = await page.evaluate(() => ({
    live: document.getElementById('sky-live-status')?.textContent.trim(),
    focus: document.getElementById('sky-focus-title')?.textContent.trim(),
    scale: window.Orrery3D?.getScaleLevel?.(),
    stash: sessionStorage.getItem('ap-explore-moment'),
    href: location.href,
  }));
  gate('timestamp-free private stash expires closed and is consumed',
    state.live === 'Live now' && state.focus === 'Earth' && state.scale === 0 &&
      state.stash === null && !/1994|focus=mars/i.test(state.href),
    JSON.stringify(state));
  gate('stale private stash rejection has no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await context.close();
}

async function surfaceAGate(browser) {
  const routes = ['chart.html', 'deep-reading.html', 'compatibility.html', 'tonight.html'];
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = watch(page);
    const response = await page.goto(`${BASE}/${route}?nosw=1&contract=v901-surface-a`, {
      waitUntil: 'domcontentloaded', timeout: 60_000,
    });
    await page.waitForSelector('h1', { state: 'visible', timeout: 15_000 });
    await page.waitForSelector('.ap-surface-a img', { state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => {
      const still = document.querySelector('.ap-surface-a img');
      const link = document.querySelector('.ap-surface-a');
      return {
        models: document.querySelectorAll('void-orrery').length,
        canvases: document.querySelectorAll('canvas').length,
        receipt: document.querySelector('.ap-surface-a__receipt')?.textContent.replace(/\s+/g, ' ').trim(),
        href: link?.getAttribute('href'),
        alt: still?.getAttribute('alt'),
        loaded: Boolean(still?.complete && still.naturalWidth > 0),
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    gate(`${route} is an honest authored still, not another WebGL owner`, response?.ok() && state.models === 0 && state.canvases === 0 && state.loaded && /schematic/i.test(state.receipt || '') && /not a live feed/i.test(state.alt || ''), JSON.stringify(state));
    gate(`${route} bridges into the one Observatory`, /index\.html#m=now&focus=earth/.test(state.href || ''), state.href || 'missing');
    gate(`${route} phone layout has no horizontal overflow`, state.overflowX <= 1, `${state.overflowX}px`);

    if (route === 'chart.html') {
      const chart = await page.evaluate(() => ({
        min: document.getElementById('date-input')?.min,
        max: document.getElementById('date-input')?.max,
        bridge: Boolean(document.getElementById('ap-chart-sky-bridge')),
      }));
      gate('Chart declares its supported date range and sitting bridge', chart.min === '1800-01-01' && chart.max === '2200-12-31' && chart.bridge, JSON.stringify(chart));
    }
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: join(OUT, `surface-a-${route.replace('.html', '')}-phone.png`), fullPage: false });
    gate(`${route} has no runtime errors`, errors.length === 0, errors.slice(0, 5).join(' | '));
    await page.close();
  }
}

async function studioShopGate(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = watch(page);
  const response = await page.goto(`${BASE}/shop.html?nosw=1&contract=v901-studio`, {
    waitUntil: 'domcontentloaded', timeout: 60_000,
  });
  await page.waitForSelector('.ap-shop-hero__art img', { state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => {
    const hero = document.querySelector('.ap-shop-hero__art img');
    const checkoutButtons = Array.from(document.querySelectorAll('.ap-studio-checkout'));
    return {
      models: document.querySelectorAll('void-orrery').length,
      canvases: document.querySelectorAll('canvas').length,
      heroLoaded: Boolean(hero?.complete && hero.naturalWidth > 0),
      heroAlt: hero?.getAttribute('alt'),
      skus: Array.from(document.querySelectorAll('[data-product-sku]')).map(el => el.getAttribute('data-product-sku')),
      checkoutCount: checkoutButtons.length,
      checkoutClosed: checkoutButtons.every(button => button.disabled),
      gumroadLinks: document.querySelectorAll('a[href*="gumroad.com/l/"]').length,
      support: document.querySelector('a[href="https://ko-fi.com/astroprecise"]')?.getAttribute('href'),
      observatory: document.querySelector('.ap-shop-free a[href="index.html"]')?.textContent.trim(),
      forms: document.querySelectorAll('form, input, textarea').length,
      text: document.body.innerText,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  gate('Shop renders the honest v901 Studio artwork without another WebGL owner',
    response?.ok() && state.models === 0 && state.canvases === 0 && state.heroLoaded &&
      /fictional/i.test(state.heroAlt || '') && /schematic/i.test(state.heroAlt || ''),
    JSON.stringify(state));
  gate('Shop exposes exactly the three v901 Studio editions',
    JSON.stringify(state.skus) === JSON.stringify([
      'natal-sky-print-pack', 'personal-sky-keepsake', 'whole-sky-edition',
    ]), JSON.stringify(state.skus));
  gate('Shop keeps checkout closed and exposes no Gumroad sales path',
    state.checkoutCount === 3 && state.checkoutClosed && state.gumroadLinks === 0 &&
      /Checkout remains closed/i.test(state.text),
    JSON.stringify({ checkoutCount: state.checkoutCount, checkoutClosed: state.checkoutClosed, gumroadLinks: state.gumroadLinks }));
  gate('Shop keeps the free Observatory and optional Ko-fi routes honest',
    state.support === 'https://ko-fi.com/astroprecise' && /Enter the Observatory/.test(state.observatory || '') &&
      /Ko-fi support is optional/i.test(state.text),
    JSON.stringify({ support: state.support, observatory: state.observatory }));
  gate('Shop has no email capture or phone overflow',
    state.forms === 0 && /No email capture/i.test(state.text) && state.overflowX <= 1,
    JSON.stringify({ forms: state.forms, overflowX: state.overflowX }));
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: join(OUT, 'studio-shop-phone.png'), fullPage: false });
  gate('shop.html has no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await page.close();
}

async function eclipseGate(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = watch(page);
  const response = await page.goto(`${BASE}/eclipse.html?nosw=1&contract=v900-eclipse`, {
    waitUntil: 'domcontentloaded', timeout: 60_000,
  });
  await page.waitForSelector('.ap-eclipse-live__canvas', { state: 'visible', timeout: 30_000 });
  const state = await page.evaluate(() => ({
    dedicatedCanvases: document.querySelectorAll('.ap-eclipse-live__canvas').length,
    generalModels: document.querySelectorAll('void-orrery').length,
    guide: Boolean(document.querySelector('.ap-eclipse-guide__download[href$=".pdf"]')),
    controls: Boolean(document.querySelector('[data-eclipse-play]') && document.querySelector('[data-eclipse-lens="earth"]')),
    saleLanguage: /buy now|£7|checkout/i.test(document.body.innerText),
  }));
  gate('Eclipse keeps its single dedicated simulation and free guide', response?.ok() && state.dedicatedCanvases === 1 && state.generalModels === 0 && state.guide && state.controls, JSON.stringify(state));
  gate('Eclipse page no longer advertises the archived checkout', !state.saleLanguage);
  gate('Eclipse simulation has no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await page.close();
}

const launch = { headless: true, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] };
if (existsSync(WINDOWS_CHROME)) launch.executablePath = WINDOWS_CHROME;
const browser = await chromium.launch(launch);
try {
  await homeGate(browser, { width: 1440, height: 900 }, 'desktop', false);
  await homeGate(browser, { width: 390, height: 844 }, 'phone', true);
  await responsiveResizeGate(browser);
  await deepLinkGate(browser);
  await stalePrivateStashGate(browser);
  await surfaceAGate(browser);
  await studioShopGate(browser);
  await eclipseGate(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} v901 UI gate(s) failed:`);
  failures.forEach(failure => console.error(` - ${failure}`));
  process.exit(1);
}
console.log(`\nALL V901 UI GATES PASS · screenshots: ${OUT}`);
