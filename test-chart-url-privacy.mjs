import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './tools/visual-check/node_modules/playwright/index.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const WEBSITE = resolve(ROOT, 'website');
const WINDOWS_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const failures = [];
const serverRequests = [];
const PERSONAL_KEYS = new Set([
  'name', 'date', 'time', 'city', 'dob', 'tob', 'birth', 'birthdate', 'birthtime',
  'place', 'location', 'n', 'd', 't', 'c', 'm', 'lat', 'lon', 'tz',
  'a', 'at', 'an', 'az', 'ac', 'b', 'bt', 'bn', 'bz', 'bc',
  'p1d', 'p1t', 'p1n', 'p1la', 'p1lo', 'p1tz', 'p1c',
  'p2d', 'p2t', 'p2n', 'p2la', 'p2lo', 'p2tz', 'p2c',
  'person1-name', 'person1-date', 'person1-time', 'person1-city',
  'person1-lat', 'person1-lon', 'person1-tz',
  'person2-name', 'person2-date', 'person2-time', 'person2-city',
  'person2-lat', 'person2-lon', 'person2-tz'
]);

function gate(name, pass, detail = '') {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures.push(name);
}

function carriesLegacyBirthFields(value) {
  if (!value) return false;
  try {
    const url = new URL(value, 'http://127.0.0.1');
    const queryKeys = Array.from(url.searchParams.keys(), key => key.toLowerCase());
    const rawHash = url.hash.replace(/^#\??/, '');
    const hashKeys = Array.from(new URLSearchParams(rawHash).keys(), key => key.toLowerCase());
    return queryKeys.concat(hashKeys).some(key => PERSONAL_KEYS.has(key));
  } catch {
    return true;
  }
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
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2'
  })[extname(path).toLowerCase()] || 'application/octet-stream';
}

async function startServer() {
  const server = createServer((request, response) => {
    serverRequests.push({
      url: request.url || '/',
      referer: request.headers.referer || ''
    });
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

const cases = [
  {
    id: 'long query',
    suffix: '?NOSW=1&LITE=1&%6E%61%6D%65=Ada%20Needle&DaTe=1901-02-03&%74ime=04%3A05&CITY=Zzyzxville&Lat=35.142&LON=-116.104&%74%7A=America%2FLos_Angeles&contract=drop-me',
    expectedSearch: { nosw: '1', lite: '1' },
    expectedHash: ''
  },
  {
    id: 'compact query',
    suffix: '?nosw=1&ENTRY=PRIVATE-REENTRY&%4E=Compact%20Needle&D=1911-12-13&%74=06%3A07&C=Qqqxborough&%4C%41%54=51.501&LoN=-0.142&TZ=Europe%2FLondon',
    expectedSearch: { nosw: '1' },
    expectedHash: '',
    expectPrivateReentry: true
  },
  {
    id: 'long hash',
    suffix: '?nosw=1&unknown=discard#%6e%61%6d%65=Hash%20Needle&DATE=1922-08-09&TiMe=08%3A11&City=Hashville&LAT=12.34&lon=56.78&tz=Etc%2FGMT%2B3',
    expectedSearch: { nosw: '1' },
    expectedHash: ''
  },
  {
    id: 'compact hash',
    suffix: '?lite=1#%4E=Tiny%20Hash&D=1933-10-11&T=12%3A13&C=Tinytown&LAT=-22.4&LON=130.8&TZ=Australia%2FDarwin',
    expectedSearch: { lite: '1' },
    expectedHash: ''
  },
  {
    id: 'known safe controls and anchor',
    suffix: '?LITE=1&NOSW=1&tracking=discard#main%2Dcontent',
    expectedSearch: { lite: '1', nosw: '1' },
    expectedHash: '#main-content'
  }
];

const server = await startServer();
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
let browser;

try {
  browser = await launchBrowser();

  for (const testCase of cases) {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.__chartPrivacyReplaceCalls = [];
      const nativeReplaceState = window.history.replaceState.bind(window.history);
      window.history.replaceState = function (state, title, url) {
        window.__chartPrivacyReplaceCalls.push(String(url));
        return nativeReplaceState(state, title, url);
      };
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    const requestStart = serverRequests.length;
    await page.goto(base + '/chart.html' + testCase.suffix, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000
    });
    await page.waitForSelector('#chart-form', { state: 'attached' });
    await page.waitForTimeout(150);

    const result = await page.evaluate(() => ({
      href: location.href,
      search: Object.fromEntries(new URLSearchParams(location.search)),
      hash: location.hash,
      values: {
        name: document.getElementById('name-input')?.value || '',
        date: document.getElementById('date-input')?.value || '',
        time: document.getElementById('time-input')?.value || '',
        city: document.getElementById('city-input')?.value || '',
        lat: document.getElementById('lat-input')?.value || '',
        lon: document.getElementById('lon-input')?.value || '',
        tz: document.getElementById('tz-input')?.value || ''
      },
      resultVisible: !document.getElementById('chart-result')?.classList.contains('hidden'),
      privateReentryNote: document.getElementById('chart-handoff-note')?.textContent || '',
      replaceCalls: window.__chartPrivacyReplaceCalls || []
    }));

    const requests = serverRequests.slice(requestStart);
    const subresources = requests.slice(1);
    const leakingReferrers = subresources.filter(request => carriesLegacyBirthFields(request.referer));
    const fieldsBlank = Object.values(result.values).every(value => value === '');
    const queryMatches = JSON.stringify(result.search) === JSON.stringify(testCase.expectedSearch);
    const cleanReplace = result.replaceCalls.length >= 1 &&
      result.replaceCalls.every(url => !carriesLegacyBirthFields(url));

    gate(`${testCase.id} · address is canonical`, queryMatches && result.hash === testCase.expectedHash,
      `href=${result.href}`);
    gate(`${testCase.id} · legacy URL never restores the form`, fieldsBlank && !result.resultVisible,
      JSON.stringify(result.values));
    gate(`${testCase.id} · replacement history contains no birth fields`, cleanReplace,
      JSON.stringify(result.replaceCalls));
    gate(`${testCase.id} · subresources receive no personal referrer`, subresources.length > 5 && leakingReferrers.length === 0,
      `requests=${subresources.length} leaking=${JSON.stringify(leakingReferrers.slice(0, 3))}`);
    if (testCase.expectPrivateReentry) {
      gate(`${testCase.id} · safe re-entry control survives until consumed`,
        result.replaceCalls.some(url => /[?&]entry=private-reentry(?:&|#|$)/.test(url)) &&
          /storage is blocked/i.test(result.privateReentryNote),
        JSON.stringify(result.replaceCalls));
    }
    gate(`${testCase.id} · controller has no page errors`, pageErrors.length === 0, pageErrors.join(' | '));

    await context.close();
  }

  const lifePathCases = [
    {
      id: 'life path encoded query',
      suffix: '?NOSW=1&LITE=1&%64%61%74%65=1901-02-03&NaMe=Wibblenaut&campaign=discard',
      expectedSearch: { nosw: '1', lite: '1' }
    },
    {
      id: 'life path mixed-case hash',
      suffix: '?nosw=1#DaTe=1912-03-04&%4E%61%6D%65=Hash%20Needle',
      expectedSearch: { nosw: '1' }
    }
  ];

  for (const lifePathCase of lifePathCases) {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.__lifePathPrivacyReplaceCalls = [];
      const nativeReplaceState = window.history.replaceState.bind(window.history);
      window.history.replaceState = function (state, title, url) {
        window.__lifePathPrivacyReplaceCalls.push(String(url));
        return nativeReplaceState(state, title, url);
      };
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const requestStart = serverRequests.length;
    await page.goto(base + '/lifepath.html' + lifePathCase.suffix, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000
    });
    await page.waitForSelector('#lp-form', { state: 'attached' });
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => ({
      href: location.href,
      search: Object.fromEntries(new URLSearchParams(location.search)),
      hash: location.hash,
      date: document.getElementById('lp-birthdate')?.value || '',
      name: document.getElementById('lp-name')?.value || '',
      replaceCalls: window.__lifePathPrivacyReplaceCalls || []
    }));
    const requests = serverRequests.slice(requestStart);
    const subresources = requests.slice(1);
    const leakingReferrers = subresources.filter(request => carriesLegacyBirthFields(request.referer));
    gate(`${lifePathCase.id} · address is canonical`,
      JSON.stringify(result.search) === JSON.stringify(lifePathCase.expectedSearch) && !result.hash,
      result.href);
    gate(`${lifePathCase.id} · legacy URL never restores the form`,
      !result.date && !result.name, JSON.stringify({ date: result.date, name: result.name }));
    gate(`${lifePathCase.id} · replacement history contains no birth fields`,
      result.replaceCalls.length >= 1 && result.replaceCalls.every(url => !carriesLegacyBirthFields(url)),
      JSON.stringify(result.replaceCalls));
    gate(`${lifePathCase.id} · subresources receive no personal referrer`,
      subresources.length > 5 && leakingReferrers.length === 0,
      `requests=${subresources.length} leaking=${JSON.stringify(leakingReferrers.slice(0, 3))}`);
    gate(`${lifePathCase.id} · controller has no page errors`,
      pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  const compatibilityCases = [
    {
      id: 'compatibility native query',
      suffix: '?Person1-Name=Ada%20Needle&Person1-Date=1990-01-02&Person1-Time=03%3A04&Person1-City=London&Person1-Lat=51.5&Person1-Lon=-0.1&Person1-Tz=Europe%2FLondon&nosw=1',
      expectedSearch: { nosw: '1' }
    },
    {
      id: 'compatibility encoded compact hash',
      suffix: '?LITE=1#%70%31%6E=Ada&P1D=1990-01-02&P1T=03%3A04&P1C=London&P1TZ=Europe%2FLondon',
      expectedSearch: { lite: '1' }
    }
  ];

  for (const compatibilityCase of compatibilityCases) {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.__compatibilityPrivacyReplaceCalls = [];
      const nativeReplaceState = window.history.replaceState.bind(window.history);
      window.history.replaceState = function (state, title, url) {
        window.__compatibilityPrivacyReplaceCalls.push(String(url));
        return nativeReplaceState(state, title, url);
      };
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const requestStart = serverRequests.length;
    await page.goto(base + '/compatibility.html' + compatibilityCase.suffix, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000
    });
    await page.waitForSelector('#compat-form', { state: 'attached' });
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => ({
      href: location.href,
      search: Object.fromEntries(new URLSearchParams(location.search)),
      hash: location.hash,
      values: Array.from(document.querySelectorAll('#compat-form input')).map(input => input.value),
      replaceCalls: window.__compatibilityPrivacyReplaceCalls || []
    }));
    const requests = serverRequests.slice(requestStart);
    const subresources = requests.slice(1);
    const leakingReferrers = subresources.filter(request => carriesLegacyBirthFields(request.referer));
    gate(`${compatibilityCase.id} · address is canonical`,
      JSON.stringify(result.search) === JSON.stringify(compatibilityCase.expectedSearch) && !result.hash,
      result.href);
    gate(`${compatibilityCase.id} · legacy URL never restores the form`,
      result.values.every(value => !value), JSON.stringify(result.values));
    gate(`${compatibilityCase.id} · replacement history contains no birth fields`,
      result.replaceCalls.length >= 1 && result.replaceCalls.every(url => !carriesLegacyBirthFields(url)),
      JSON.stringify(result.replaceCalls));
    gate(`${compatibilityCase.id} · subresources receive no personal referrer`,
      subresources.length > 5 && leakingReferrers.length === 0,
      `requests=${subresources.length} leaking=${JSON.stringify(leakingReferrers.slice(0, 3))}`);
    gate(`${compatibilityCase.id} · controller has no page errors`,
      pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  const retiredExploreCases = [
    {
      id: 'retired Explore personal query',
      suffix: '?nosw=1&%6D=1994-03-14T09%3A12%3A00.000Z&campaign=drop#focus=earth&scale=2',
      expectedSearch: { nosw: '1' },
      expectedHash: '#focus=earth&scale=2'
    },
    {
      id: 'retired Explore personal hash',
      suffix: '?LITE=1#%4D=2001-02-03T04%3A05%3A00.000Z&FoCuS=venus&Scale=1',
      expectedSearch: { lite: '1' },
      expectedHash: '#focus=venus&scale=1'
    }
  ];

  for (const exploreCase of retiredExploreCases) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const requestStart = serverRequests.length;
    await page.goto(base + '/explore.html' + exploreCase.suffix, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000
    });
    await page.waitForURL(url => url.pathname.endsWith('/index.html'), { timeout: 10_000 });
    await page.waitForTimeout(100);
    const finalUrl = new URL(page.url());
    const requests = serverRequests.slice(requestStart);
    const leakingReferrers = requests.slice(1).filter(request => carriesLegacyBirthFields(request.referer));
    gate(`${exploreCase.id} · alias fails closed to Observatory controls`,
      JSON.stringify(Object.fromEntries(finalUrl.searchParams)) === JSON.stringify(exploreCase.expectedSearch) &&
        finalUrl.hash === exploreCase.expectedHash && !carriesLegacyBirthFields(finalUrl.href),
      finalUrl.href);
    gate(`${exploreCase.id} · redirected assets receive no personal referrer`,
      requests.length > 5 && leakingReferrers.length === 0,
      `requests=${requests.length} leaking=${JSON.stringify(leakingReferrers.slice(0, 3))}`);
    gate(`${exploreCase.id} · controller has no page errors`,
      pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const requestStart = serverRequests.length;
    await page.goto(base + '/index.html?nosw=1&lite=1&name=Alice&dob=1994-03-14&time=09%3A12&city=London#m=1994-03-14T09%3A12%3A00Z&focus=mars', {
      waitUntil: 'domcontentloaded', timeout: 45_000
    });
    await page.waitForTimeout(100);
    const finalUrl = new URL(page.url());
    const subresources = serverRequests.slice(requestStart + 1);
    const leakingReferrers = subresources.filter(request => carriesLegacyBirthFields(request.referer));
    gate('Observatory direct legacy query · only safe runtime flags and controls survive',
      finalUrl.pathname === '/index.html' && finalUrl.search === '?nosw=1&lite=1' &&
        finalUrl.hash === '#focus=mars' && !carriesLegacyBirthFields(finalUrl.href),
      finalUrl.href);
    gate('Observatory direct legacy query · assets receive no personal referrer',
      subresources.length > 5 && leakingReferrers.length === 0,
      `requests=${subresources.length} leaking=${JSON.stringify(leakingReferrers.slice(0, 3))}`);
    gate('Observatory direct legacy query · controller has no early page errors',
      pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  for (const acceptedCase of [
    {
      id: 'Observatory accepted live moment',
      suffix: '?nosw=1&name=Alice&dob=1994-03-14#m=now&name=Alice&dob=1994-03-14&city=Leeds&focus=earth',
      search: '?nosw=1', hash: '#m=now&focus=earth'
    },
    {
      id: 'Observatory accepted public event',
      suffix: '?lite=1&name=Alice#m=2020-06-14T12%3A00%3A00.000Z&public=1&name=Alice&dob=1994-03-14&focus=mars',
      search: '?lite=1', hash: '#m=2020-06-14T12%3A00%3A00.000Z&public=1&focus=mars'
    }
  ]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const requestStart = serverRequests.length;
    await page.goto(base + '/index.html' + acceptedCase.suffix, {
      waitUntil: 'domcontentloaded', timeout: 45_000
    });
    await page.waitForTimeout(100);
    const finalUrl = new URL(page.url());
    const hashParams = new URLSearchParams(finalUrl.hash.replace(/^#/, ''));
    const allowedHashKeys = new Set(['m', 'public', 'focus', 'scale']);
    const subresources = serverRequests.slice(requestStart + 1);
    gate(`${acceptedCase.id} · unrelated personal fields are removed`,
      finalUrl.search === acceptedCase.search && finalUrl.hash === acceptedCase.hash &&
        Array.from(hashParams.keys()).every(key => allowedHashKeys.has(key)) &&
        !/[?&#](?:name|dob|city)=|Alice|1994-03-14|Leeds/i.test(finalUrl.href),
      finalUrl.href);
    gate(`${acceptedCase.id} · assets receive no personal referrer`,
      subresources.length > 5 && subresources.every(request => !carriesLegacyBirthFields(request.referer)),
      `requests=${subresources.length}`);
    await context.close();
  }

  const aliasCases = [
    {
      id: 'classic index alias', path: '/index-classic.html',
      suffix: '?nosw=1&name=Ada&dob=1994-03-14#M=1994-03-14T09%3A12%3A00Z&focus=mars&scale=2',
      pathname: '/index.html', search: '?nosw=1', hash: '#focus=mars&scale=2'
    },
    {
      id: 'full index alias', path: '/index-full.html',
      suffix: '?lite=1&date=1994-03-14&city=London#focus=venus&m=1994-03-14T09%3A12%3A00Z',
      pathname: '/index.html', search: '?lite=1', hash: '#focus=venus'
    },
    {
      id: 'lite index alias', path: '/index-lite.html',
      suffix: '?nosw=1&lat=51.5&lon=-0.1#focus=moon&scale=1&time=09%3A12',
      pathname: '/index.html', search: '?nosw=1', hash: '#focus=moon&scale=1'
    },
    {
      id: 'My Sky alias', path: '/mysky.html',
      suffix: '?nosw=1&name=Ada&date=1994-03-14#m=1994-03-14T09%3A12%3A00Z',
      pathname: '/index.html', search: '?nosw=1', hash: ''
    },
    {
      id: 'Observatory alias', path: '/observatory.html',
      suffix: '?lite=1&city=London#name=Ada',
      pathname: '/index.html', search: '?lite=1', hash: '#lead'
    },
    {
      id: 'Deep Time alias', path: '/deep-time.html',
      suffix: '?nosw=1&dob=1994-03-14#time=09%3A12',
      pathname: '/index.html', search: '?nosw=1', hash: '#lead'
    },
    {
      id: 'Synastry alias', path: '/synastry.html',
      suffix: '?lite=1&person1-name=Ada&person1-date=1994-03-14#P1T=09%3A12',
      pathname: '/compatibility.html', search: '?lite=1', hash: ''
    }
  ];

  for (const aliasCase of aliasCases) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const requestStart = serverRequests.length;
    await page.goto(base + aliasCase.path + aliasCase.suffix, {
      waitUntil: 'domcontentloaded', timeout: 45_000
    });
    await page.waitForURL(url => url.pathname === aliasCase.pathname, { timeout: 10_000 });
    await page.waitForTimeout(100);
    const finalUrl = new URL(page.url());
    const subresources = serverRequests.slice(requestStart + 1);
    const leakingReferrers = subresources.filter(request => carriesLegacyBirthFields(request.referer));
    gate(`${aliasCase.id} · only safe route controls survive`,
      finalUrl.pathname === aliasCase.pathname && finalUrl.search === aliasCase.search &&
        finalUrl.hash === aliasCase.hash && !carriesLegacyBirthFields(finalUrl.href),
      finalUrl.href);
    gate(`${aliasCase.id} · redirected assets receive no personal referrer`,
      subresources.length > 3 && leakingReferrers.length === 0,
      `requests=${subresources.length} leaking=${JSON.stringify(leakingReferrers.slice(0, 3))}`);
    gate(`${aliasCase.id} · redirect has no page errors`,
      pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  const canonicalShareSurfaceCases = [
    {
      id: 'Horoscope share surface', path: '/horoscope.html',
      suffix: '?nosw=1&name=Ada&dob=1994-03-14&sign=leo#time=09%3A12',
      search: '?nosw=1&sign=leo', hash: ''
    },
    {
      id: 'Quiz share surface', path: '/quiz.html',
      suffix: '?lite=1&name=Ada&dob=1994-03-14#city=London',
      search: '?lite=1', hash: ''
    },
    {
      id: 'Eclipse share surface', path: '/eclipse.html',
      suffix: '?nosw=1&name=Ada&dob=1994-03-14&moment=1994-03-14T09%3A12%3A00.000Z&public=1&lens=earth#name=Ada',
      search: '?nosw=1&lens=earth', hash: ''
    },
    {
      id: 'Eclipse valid public replay', path: '/eclipse.html',
      suffix: '?lite=1&name=Ada&moment=2026-08-12T17%3A45%3A51.000Z&public=1&lens=shadow#ap-eclipse-live',
      search: '?lite=1&lens=shadow&moment=2026-08-12T17%3A45%3A51.000Z&public=1', hash: '#ap-eclipse-live'
    },
    {
      id: 'Guides share surface', path: '/guides.html',
      suffix: '?nosw=1&name=Ada&dob=1994-03-14#guides?story=birth-chart-basics&city=London',
      search: '?nosw=1', hash: '#guides?story=birth-chart-basics'
    }
  ];

  for (const surfaceCase of canonicalShareSurfaceCases) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const requestStart = serverRequests.length;
    await page.goto(base + surfaceCase.path + surfaceCase.suffix, {
      waitUntil: 'domcontentloaded', timeout: 45_000
    });
    await page.waitForTimeout(100);
    const finalUrl = new URL(page.url());
    const subresources = serverRequests.slice(requestStart + 1);
    const leakingReferrers = subresources.filter(request => carriesLegacyBirthFields(request.referer));
    gate(`${surfaceCase.id} · legacy ingress is canonical before sharing`,
      finalUrl.pathname === surfaceCase.path && finalUrl.search === surfaceCase.search &&
        finalUrl.hash === surfaceCase.hash && !carriesLegacyBirthFields(finalUrl.href),
      finalUrl.href);
    gate(`${surfaceCase.id} · assets receive no personal referrer`,
      subresources.length > 3 && leakingReferrers.length === 0,
      `requests=${subresources.length} leaking=${JSON.stringify(leakingReferrers.slice(0, 3))}`);
    gate(`${surfaceCase.id} · controller has no early page errors`,
      pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(base + '/moonphase.html?nosw=1', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000
    });
    await page.waitForSelector('#moonphase-date', { state: 'visible', timeout: 15_000 });
    await page.locator('#moonphase-date').fill('1994-03-14');
    await page.locator('#moonphase-submit').click();
    await page.waitForSelector('#moonphase-result .mp-card', { state: 'visible', timeout: 20_000 });
    const result = await page.evaluate(() => ({
      href: document.querySelector('#moonphase-result a[href*="index.html"]')?.getAttribute('href') || '',
      stash: sessionStorage.getItem('ap-explore-moment') || '',
      address: location.href
    }));
    let stash = null;
    try { stash = JSON.parse(result.stash); } catch { stash = null; }
    gate('birthday Moon model link carries no personal date',
      result.href === 'index.html#focus=moon' && !/1994|[?&#]m=/i.test(result.href),
      result.href);
    gate('birthday Moon instant stays in same-tab storage',
      stash?.m === '1994-03-14T12:00:00.000Z' && stash?.focus === 'moon',
      result.stash);
    gate('birthday Moon page address remains clean',
      !carriesLegacyBirthFields(result.address), result.address);
    gate('birthday Moon privacy flow has no page errors',
      pageErrors.length === 0, pageErrors.join(' | '));

    await page.evaluate(() => { window.__mpXss = 0; });
    await page.locator('#mp-tab-compat').click();
    await page.locator('#mp-compat-name-a').fill('<img src=x onerror="window.__mpXss+=1">');
    await page.locator('#mp-compat-date-a').fill('1994-03-14');
    await page.locator('#mp-compat-name-b').fill('<svg onload="window.__mpXss+=1"></svg>');
    await page.locator('#mp-compat-date-b').fill('1995-04-15');
    await page.locator('#moonphase-compat-submit').click();
    await page.waitForSelector('#moonphase-compat-result .mp-card', { state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(100);
    const xss = await page.evaluate(() => ({
      executed: window.__mpXss,
      attackerNodes: document.querySelectorAll('#moonphase-compat-result img[src="x"], #moonphase-compat-result svg[onload]').length,
      labels: Array.from(document.querySelectorAll('#moonphase-compat-result .mp-mini__label'), node => node.textContent)
    }));
    gate('Moon compatibility names render as inert text',
      xss.executed === 0 && xss.attackerNodes === 0 &&
        xss.labels.some(label => label.includes('<img src=x')) &&
        xss.labels.some(label => label.includes('<svg onload=')),
      JSON.stringify(xss));
    await context.close();
  }

  const sameDocumentCases = [
    {
      id: 'chart compact mixed-case hash',
      path: '/chart.html?nosw=1',
      hash: '#%4E=Needle&D=1944-01-02&T=03%3A04&C=Needleton&LAT=51.5&LON=-0.1&TZ=Europe%2FLondon'
    },
    {
      id: 'chart long encoded hash',
      path: '/chart.html?lite=1',
      hash: '#%6E%61%6D%65=Needle&%64%61%74%65=1955-02-03&%74%69%6D%65=04%3A05&%63%69%74%79=Needleton'
    },
    {
      id: 'compatibility compact mixed-case hash',
      path: '/compatibility.html?nosw=1',
      hash: '#P1N=Ada&P1D=1966-03-04&P1T=05%3A06&P1C=London&P1TZ=Europe%2FLondon'
    },
    {
      id: 'compatibility encoded native hash',
      path: '/compatibility.html?nosw=1',
      hash: '#%70%65%72%73%6F%6E%31%2D%6E%61%6D%65=Ada&PERSON1-DATE=1977-04-05&person2-city=Paris'
    },
    {
      id: 'life path encoded legacy hash',
      path: '/lifepath.html?nosw=1',
      hash: '#%64%61%74%65=1988-05-06&NaMe=Needle'
    }
  ];

  for (const sameDocumentCase of sameDocumentCases) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(base + sameDocumentCase.path, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000
    });
    await page.evaluate(hash => { window.location.hash = hash; }, sameDocumentCase.hash);
    await page.waitForFunction(() => !location.hash, null, { timeout: 5_000 });
    const href = page.url();
    gate(`${sameDocumentCase.id} · live fragment is scrubbed`,
      !carriesLegacyBirthFields(href) && !new URL(href).hash,
      href);
    gate(`${sameDocumentCase.id} · controller has no page errors`,
      pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failures.length) {
  console.error(`\n${failures.length} chart URL privacy regression(s) failed: ${failures.join(', ')}`);
  process.exit(1);
}

console.log('\nLegacy personal URL privacy regression: PASS');
