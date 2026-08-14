import { chromium } from './node_modules/playwright/index.mjs';
import { readFileSync, rmSync } from 'node:fs';
import { PNG } from 'pngjs';

const BASE = (process.env.AP_BASE || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const OUT = '/tmp/astroprecise-1978-03-14.png';
const errors = [];
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  page.on('pageerror', (error) => errors.push(`PAGEERROR ${error.message || error}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`CONSOLE ${message.text()}`);
  });

  await page.goto(`${BASE}/chart.html?nosw=1&diag=birth-hour-still`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.waitForSelector('#orr canvas', { state: 'visible', timeout: 35_000 });
  await page.waitForFunction(() => {
    const orrery = document.getElementById('orr');
    return orrery?._ready === true &&
      orrery.getAttribute('data-engine') === 'webgl' &&
      window.Orrery3D &&
      typeof window.Orrery3D.captureBirthHourStill === 'function';
  }, null, { timeout: 35_000 });

  const known = {
    jd: Date.UTC(1978, 2, 14, 14, 0) / 86400000 + 2440587.5,
    birthDate: '1978-03-14',
    birthTime: '14:00',
    timeKnown: true,
    timeAccuracy: 'exact',
    place: 'London, United Kingdom',
    timezone: 'Europe/London',
  };
  await page.evaluate((detail) => {
    const orrery = document.getElementById('orr');
    orrery.setNatalClocks({
      a: { jd: detail.jd - 1000, label: 'A' },
      b: { jd: detail.jd + 1000, label: 'B' },
    });
    document.dispatchEvent(new CustomEvent('ap-keep-sky-context', { detail }));
  }, known);

  const caption = await page.locator('#keep-sky-caption').innerText();
  assert(caption.includes('Authored whole-system camera'), 'camera description missing');
  assert(caption.includes('1978-03-14') && caption.includes('14:00 local'), 'local birth time missing');
  assert(caption.includes('London, United Kingdom'), 'birth place missing');
  assert(caption.includes('computed at 1978-03-14 14:00 UTC'), 'computed UTC minute missing');
  assert(await page.locator('#keep-sky').isEnabled(), 'keep button did not enable');

  const captureProbe = await page.evaluate((jd) => {
    try {
      const still = window.Orrery3D.captureBirthHourStill({ jd, scale: 2 });
      return { ok: !!still, width: still?.width || 0, height: still?.height || 0 };
    } catch (error) {
      return { ok: false, error: String(error?.stack || error) };
    }
  }, known.jd);
  assert(captureProbe.ok && captureProbe.width > 0 && captureProbe.height > 0,
    `engine capture failed: ${JSON.stringify(captureProbe)}`);

  const adapterProbe = await page.evaluate(async (detail) => {
    const orrery = document.getElementById('orr');
    const still = orrery.captureStill({
      mode: 'birth-hour',
      jd: detail.jd,
      timeKnown: detail.timeKnown,
    });
    if (!still?.toBlob) return { ok: false, ready: orrery._ready, engine: orrery.getAttribute('data-engine') };
    const blob = await new Promise((resolve) => still.toBlob(resolve, 'image/png'));
    return { ok: !!blob, bytes: blob?.size || 0, width: still.width, height: still.height };
  }, known);
  assert(adapterProbe.ok && adapterProbe.bytes > 0,
    `adapter capture failed: ${JSON.stringify(adapterProbe)}`);

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.locator('#keep-sky').click();
  const download = await downloadPromise.catch(async (error) => {
    const state = await page.evaluate(() => ({
      button: document.getElementById('keep-sky')?.textContent,
      disabled: document.getElementById('keep-sky')?.disabled,
      errors: window.__keepSkyErrors || null,
    }));
    throw new Error(`${error.message}; keep state: ${JSON.stringify(state)}`);
  });
  assert(download.suggestedFilename() === 'astroprecise-1978-03-14.png',
    `unexpected filename: ${download.suggestedFilename()}`);
  await download.saveAs(OUT);

  const png = PNG.sync.read(readFileSync(OUT));
  assert(png.width >= 800 && png.height >= 500, `still too small: ${png.width}x${png.height}`);
  let visiblePixels = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] + png.data[i + 1] + png.data[i + 2] > 48) visiblePixels++;
  }
  assert(visiblePixels / (png.width * png.height) > 0.01, 'captured still is effectively empty');

  await page.evaluate((detail) => {
    document.dispatchEvent(new CustomEvent('ap-keep-sky-context', { detail }));
  }, {
    jd: Date.UTC(1978, 2, 14, 12, 0) / 86400000 + 2440587.5,
    birthDate: '1978-03-14',
    birthTime: null,
    timeKnown: false,
    timeAccuracy: 'unknown',
    place: 'London, United Kingdom',
    timezone: 'Europe/London',
  });
  const unknownCaption = await page.locator('#keep-sky-caption').innerText();
  assert(unknownCaption.includes('birth time unknown'), 'unknown-time disclosure missing');
  assert(unknownCaption.includes('12:00 UTC date reference'), 'date-reference disclosure missing');
  assert(unknownCaption.includes('no precise Earth-facing hemisphere is claimed'),
    'Earth-facing honesty disclosure missing');
  assert(errors.length === 0, errors.join('\n'));

  console.log(JSON.stringify({
    result: 'PASS',
    filename: download.suggestedFilename(),
    size: `${png.width}x${png.height}`,
    visiblePixelRatio: Number((visiblePixels / (png.width * png.height)).toFixed(4)),
    knownCaption: caption,
    unknownCaption,
  }, null, 2));
} finally {
  rmSync(OUT, { force: true });
  if (browser) await browser.close();
}
