import { chromium } from './node_modules/playwright/index.mjs';

const BASE = (process.env.AP_BASE || 'http://127.0.0.1:8790').replace(/\/+$/, '');
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
  assert(await page.evaluate(() => window.APKeepSky &&
    window.APKeepSky.SURFACE_A === 'SCHEMATIC' &&
    typeof window.APKeepSky.stampSurfaceA === 'function'),
    'Keep Surface A stamp API missing');

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
    window.APKeepSky.stampSurfaceA(still, detail);
    const blob = await new Promise((resolve) => still.toBlob(resolve, 'image/png'));
    const pixels = still.getContext('2d').getImageData(0, 0, still.width, still.height).data;
    let visible = 0;
    let sampled = 0;
    for (let i = 0; i < pixels.length; i += 64) {
      sampled++;
      if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 48) visible++;
    }
    still.id = 'ap-birth-hour-still-proof';
    still.style.cssText = 'position:fixed;inset:0;width:100vw;height:auto;z-index:99999;background:var(--ap-void)';
    document.body.appendChild(still);
    return {
      ok: !!blob,
      bytes: blob?.size || 0,
      width: still.width,
      height: still.height,
      visibleRatio: visible / sampled,
      stamped: window.APKeepSky.SURFACE_A === 'SCHEMATIC',
    };
  }, known);
  assert(adapterProbe.stamped, 'Surface A SCHEMATIC stamp was not applied');
  assert(adapterProbe.ok && adapterProbe.bytes > 0 && adapterProbe.width >= 800 &&
      adapterProbe.height >= 500 && adapterProbe.visibleRatio > 0.001,
    `adapter capture failed: ${JSON.stringify(adapterProbe)}`);
  if (process.env.AP_KEEP_PROOF) {
    await page.locator('#ap-birth-hour-still-proof').screenshot({ path: process.env.AP_KEEP_PROOF });
  }
  await page.locator('#ap-birth-hour-still-proof').evaluate((element) => element.remove());

  const kept = await page.evaluate(async () => {
    const originalClick = HTMLAnchorElement.prototype.click;
    let result = null;
    HTMLAnchorElement.prototype.click = function () {
      result = { filename: this.download, href: this.href };
    };
    document.getElementById('keep-sky').click();
    for (let i = 0; i < 100 && !result; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    HTMLAnchorElement.prototype.click = originalClick;
    return {
      ...result,
      button: document.getElementById('keep-sky').textContent,
    };
  });
  assert(kept?.filename === 'astroprecise-1978-03-14.png',
    `unexpected filename: ${JSON.stringify(kept)}`);
  assert(/^blob:/.test(kept.href || ''), 'keep control did not create a local PNG blob');
  assert(kept.button === 'Saved on this device', 'keep control did not acknowledge the save');

  await page.evaluate((detail) => {
    document.dispatchEvent(new CustomEvent('ap-keep-sky-context', { detail }));
  }, {
    jd: Date.UTC(1978, 2, 14, 12, 0) / 86400000 + 2440587.5,
    birthDate: '1978-03-14',
    birthTime: null,
    timeKnown: false,
    timeAccuracy: 'unknown',
    place: 'Tokyo, Japan',
    timezone: 'Asia/Tokyo',
  });
  const unknownCaption = await page.locator('#keep-sky-caption').innerText();
  assert(unknownCaption.includes('birth time unknown'), 'unknown-time disclosure missing');
  assert(unknownCaption.includes('12:00 UTC date reference'), 'UTC date-reference disclosure missing');
  assert(unknownCaption.includes('no precise Earth-facing hemisphere is claimed'),
    'Earth-facing honesty disclosure missing');
  assert(errors.length === 0, errors.join('\n'));

  console.log(JSON.stringify({
    result: 'PASS',
    filename: kept.filename,
    size: `${adapterProbe.width}x${adapterProbe.height}`,
    pngBytes: adapterProbe.bytes,
    visiblePixelRatio: Number(adapterProbe.visibleRatio.toFixed(4)),
    knownCaption: caption,
    unknownCaption,
  }, null, 2));
} finally {
  if (browser) await browser.close();
}
