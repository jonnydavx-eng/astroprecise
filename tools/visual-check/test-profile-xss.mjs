import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './node_modules/playwright/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEBSITE = resolve(HERE, '..', '..', 'website');
const WINDOWS_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const failures = [];

function gate(name, pass, detail = '') {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures.push(name);
}

function mime(path) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2'
  })[extname(path).toLowerCase()] || 'application/octet-stream';
}

async function startServer() {
  const server = createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
      const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      let target = resolve(WEBSITE, relative.split('/').join(sep));
      if (target !== WEBSITE && !target.startsWith(WEBSITE + sep)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
      if (!existsSync(target) || !statSync(target).isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': mime(target)
      });
      createReadStream(target).pipe(response);
    } catch (error) {
      response.writeHead(500).end(String(error));
    }
  });
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  return server;
}

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (error) {
    if (!existsSync(WINDOWS_CHROME)) throw error;
    return chromium.launch({ executablePath: WINDOWS_CHROME });
  }
}

async function newPage(browser) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
  });
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { configurable: true, get: () => false });
  });
  const page = await context.newPage();
  return { context, page };
}

const attackName = '<img src=x onerror="window.__profileXss=(window.__profileXss||0)+1">';
const attackCity = '<svg onload="window.__profileXss=(window.__profileXss||0)+1"></svg>';
const attackId = 'chart" autofocus onfocus="window.__profileXss=9';
const attackSign = 'x"><svg/onload="window.__profileXss=(window.__profileXss||0)+1">';

const server = await startServer();
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
let browser;

try {
  browser = await launchBrowser();

  {
    const { context, page } = await newPage(browser);
    await page.addInitScript(({ attackName, attackCity, attackId }) => {
      localStorage.setItem('ap_profile_v2', JSON.stringify({
        name: 'Stored profile',
        created: Date.now(),
        charts: [{
          id: attackId,
          name: attackName,
          city: attackCity,
          date: '1990-04-12',
          time: '10:30',
          timeKnown: true,
          timeAccuracy: 'exact',
          lat: '51.5074',
          lon: '-0.1278',
          tz: 'Europe/London',
          sun: '"><img src=x onerror="window.__profileXss=3">'
        }],
        prefs: {},
        history: []
      }));
      localStorage.setItem('ap_charts', '[]');
    }, { attackName, attackCity, attackId });
    await page.goto(base + '/profile.html?nosw=1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.chart-gallery-item', { state: 'attached' });
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const item = document.querySelector('.chart-gallery-item');
      return {
        executed: window.__profileXss || 0,
        name: item?.querySelector('.chart-gallery-item__name')?.textContent,
        dateCity: item?.querySelector('.chart-gallery-item__date')?.textContent,
        injectedNodes: item?.querySelectorAll('img[src="x"], svg[onload]').length || 0,
        openLabel: item?.querySelector('.btn-chart-link')?.getAttribute('aria-label'),
        deleteId: item?.querySelector('.btn-chart-delete')?.dataset.id
      };
    });
    gate('saved chart markup never executes', result.executed === 0, `executed=${result.executed}`);
    gate('saved chart name is literal text', result.name === attackName);
    gate('saved chart city is literal text', result.dateCity?.endsWith(attackCity) === true);
    gate('saved chart creates no attacker-controlled nodes', result.injectedNodes === 0, `nodes=${result.injectedNodes}`);
    gate('saved chart attributes preserve inert text', result.openLabel === 'Open chart for ' + attackName && result.deleteId === attackId);
    await context.close();
  }

  {
    const { context, page } = await newPage(browser);
    await page.goto(base + '/profile.html?nosw=1', { waitUntil: 'domcontentloaded' });
    const imported = {
      name: 'Imported profile',
      charts: [{
        id: 'imported-1',
        name: attackName,
        city: attackCity,
        date: '1988-11-03',
        time: '08:15',
        timeKnown: true,
        lat: 40.7128,
        lon: -74.006,
        tz: 'America/New_York',
        sun: 'Scorpio'
      }],
      prefs: {},
      history: []
    };
    await page.locator('#import-input-setup').setInputFiles({
      name: 'astroprecise-profile.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(imported))
    });
    await page.waitForSelector('.chart-gallery-item', { state: 'attached' });
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const item = document.querySelector('.chart-gallery-item');
      const saved = JSON.parse(localStorage.getItem('ap_profile_v2') || 'null');
      return {
        executed: window.__profileXss || 0,
        name: item?.querySelector('.chart-gallery-item__name')?.textContent,
        dateCity: item?.querySelector('.chart-gallery-item__date')?.textContent,
        injectedNodes: item?.querySelectorAll('img[src="x"], svg[onload]').length || 0,
        savedName: saved?.charts?.[0]?.name,
        savedCity: saved?.charts?.[0]?.city
      };
    });
    gate('imported chart markup never executes', result.executed === 0, `executed=${result.executed}`);
    gate('imported chart name and city render as literal text', result.name === attackName && result.dateCity?.endsWith(attackCity) === true);
    gate('imported chart creates no attacker-controlled nodes', result.injectedNodes === 0, `nodes=${result.injectedNodes}`);
    gate('imported chart is normalized before storage', result.savedName === attackName && result.savedCity === attackCity);
    await context.close();
  }

  {
    const { context, page } = await newPage(browser);
    await page.goto(base + '/profile.html?nosw=1', { waitUntil: 'domcontentloaded' });
    const oversized = { name: 'Too many', charts: Array.from({ length: 101 }, (_, index) => ({ id: String(index), name: 'Chart ' + index })) };
    await page.locator('#import-input-setup').setInputFiles({
      name: 'oversized-profile.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(oversized))
    });
    await page.waitForFunction(() => document.querySelector('.toast--error'));
    const rejected = await page.evaluate(() => ({
      stored: localStorage.getItem('ap_profile_v2'),
      message: document.querySelector('.toast--error')?.textContent || ''
    }));
    gate('oversized chart collections are rejected', rejected.stored === null && /invalid or oversized/i.test(rejected.message), rejected.message);
    await context.close();
  }

  {
    const { context, page } = await newPage(browser);
    await page.goto(base + '/profile.html?nosw=1', { waitUntil: 'domcontentloaded' });
    await page.setContent(`<!doctype html><html><body class="page-home page-shop">
      <p id="personal-welcome" hidden></p>
      <p id="shop-personal-eyebrow"></p>
      <p id="shop-personal-note" hidden></p>
      <p class="shopc-featured__lede">Original lede.</p>
      <p class="live-sky-note"></p>
    </body></html>`);
    await page.evaluate(({ attackName, attackSign }) => {
      window.__profileXss = 0;
      window.AstroProfile = {
        getCharts: () => [{
          name: attackName,
          sunSign: attackSign,
          moonSign: 'capricorn',
          risingSign: attackSign,
          updatedAt: Date.now()
        }]
      };
    }, { attackName, attackSign });
    await page.addScriptTag({ url: base + '/js/personalization-engine.js' });
    await page.waitForTimeout(50);
    const result = await page.evaluate(() => ({
      executed: window.__profileXss || 0,
      big3: window.AstroPersonalization?.getBig3(window.AstroProfile.getCharts()[0]),
      welcomeText: document.getElementById('personal-welcome')?.textContent || '',
      welcomeHref: document.querySelector('#personal-welcome a')?.getAttribute('href'),
      noteText: document.getElementById('shop-personal-note')?.textContent || '',
      noteHref: document.querySelector('#shop-personal-note a')?.getAttribute('href'),
      injectedNodes: document.querySelectorAll('img[src="x"], svg[onload]').length
    }));
    gate('personalization profile markup never executes', result.executed === 0, `executed=${result.executed}`);
    gate('personalization renders names as literal text', result.welcomeText.includes(attackName));
    gate('personalization drops non-zodiac sign payloads', result.big3 === '☽ Capricorn', result.big3);
    gate('personalization builds fixed internal links', result.welcomeHref === 'transits.html' && result.noteHref === 'chart.html');
    gate('personalization creates no attacker-controlled nodes', result.injectedNodes === 0, `nodes=${result.injectedNodes}`);
    await context.close();
  }

  {
    const { context, page } = await newPage(browser);
    await page.goto(base + '/profile.html?nosw=1', { waitUntil: 'domcontentloaded' });
    await page.setContent('<!doctype html><html><body class="page-shop"><div id="shopc-grid"></div></body></html>');
    await page.evaluate(({ attackName, attackSign }) => {
      window.__profileXss = 0;
      window.AP_ASSET_V = '900';
      window.AstroProfile = {
        getCharts: () => [{
          name: attackName,
          sunSign: attackSign,
          moonSign: 'capricorn',
          risingSign: attackSign
        }]
      };
      window.AP_MON = {
        commerce: {
          cataloguePhase: 'full',
          checkout: { currency: 'GBP' },
          collections: { jewellery: { name: 'Jewellery' } },
          products: [{
            id: 'future-personal-piece',
            name: 'Future personal piece',
            blurb: 'Dormant regression fixture',
            collection: 'jewellery',
            type: 'accessory',
            icon: 'star4',
            price: 1,
            available: true,
            personalized: true
          }]
        }
      };
    }, { attackName, attackSign });
    await page.addScriptTag({ url: base + '/js/shop-commerce.js' });
    await page.waitForSelector('.shop-mini-chart-preview', { state: 'attached' });
    await page.waitForTimeout(50);
    const result = await page.evaluate(() => ({
      executed: window.__profileXss || 0,
      imageSources: Array.from(document.querySelectorAll('.shop-mini-seal img')).map(img => img.getAttribute('src')),
      imageAlts: Array.from(document.querySelectorAll('.shop-mini-seal img')).map(img => img.getAttribute('alt')),
      injectedNodes: document.querySelectorAll('img[src="x"], svg[onload]').length,
      previewText: document.querySelector('.shop-mini-chart-preview')?.textContent || ''
    }));
    gate('reactivated commerce profile markup never executes', result.executed === 0, `executed=${result.executed}`);
    gate('reactivated commerce emits only canonical seal paths',
      result.imageSources.length === 1 && result.imageSources[0] === 'assets/images/seals/zodiac/capricorn.svg',
      result.imageSources.join(', '));
    gate('reactivated commerce emits only canonical seal labels',
      result.imageAlts.length === 1 && result.imageAlts[0] === 'Capricorn', result.imageAlts.join(', '));
    gate('reactivated commerce creates no attacker-controlled nodes', result.injectedNodes === 0, `nodes=${result.injectedNodes}`);
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failures.length) {
  console.error(`\n${failures.length} profile security regression(s) failed: ${failures.join(', ')}`);
  process.exit(1);
}

console.log('\nProfile stored/imported DOM-XSS regression: PASS');
