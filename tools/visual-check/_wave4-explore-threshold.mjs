/**
 * Explore threshold phone gate.
 *
 * Proves that the entry action remains fully visible and clickable in short
 * phone landscapes as well as the narrow portrait used by the launch review.
 * Requires the preview server on AP_BASE (default http://127.0.0.1:8790).
 */
import { chromium } from './node_modules/playwright/index.mjs';
import { existsSync } from 'node:fs';

const BASE = (process.env.AP_BASE || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const WINDOWS_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CASES = [
  { width: 360, height: 640, name: 'portrait-360' },
  { width: 640, height: 360, name: 'landscape-640' },
  { width: 844, height: 390, name: 'landscape-844' },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const launch = {
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  };
  const requestedChrome = process.env.AP_CHROME || WINDOWS_CHROME;
  if (existsSync(requestedChrome)) launch.executablePath = requestedChrome;

  const browser = await chromium.launch(launch);
  let failed = 0;
  try {
    for (const testCase of CASES) {
      const context = await browser.newContext({
        viewport: { width: testCase.width, height: testCase.height },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(`page: ${error.message || error}`));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });

      try {
        await page.goto(`${BASE}/explore.html?nosw=1&threshold-check=${testCase.name}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60_000,
        });
        await page.waitForSelector('#explore-threshold-enter', { state: 'visible', timeout: 10_000 });
        await page.waitForTimeout(250);

        const layout = await page.evaluate(() => {
          const rect = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const box = element.getBoundingClientRect();
            return {
              top: box.top,
              right: box.right,
              bottom: box.bottom,
              left: box.left,
              width: box.width,
              height: box.height,
            };
          };
          return {
            viewport: { width: innerWidth, height: innerHeight },
            overflowX: document.documentElement.scrollWidth - innerWidth,
            threshold: rect('#explore-threshold'),
            title: rect('#explore-threshold-title'),
            action: rect('#explore-threshold-enter'),
          };
        });

        assert(layout.threshold && layout.title && layout.action, `${testCase.name}: threshold geometry missing`);
        assert(layout.overflowX <= 0, `${testCase.name}: horizontal overflow ${layout.overflowX}px`);
        assert(layout.title.top >= layout.threshold.top && layout.title.bottom <= layout.threshold.bottom,
          `${testCase.name}: title is clipped by threshold`);
        assert(layout.action.top >= layout.threshold.top && layout.action.bottom <= layout.threshold.bottom,
          `${testCase.name}: Enter action is clipped by threshold`);
        assert(layout.action.top >= 0 && layout.action.bottom <= layout.viewport.height,
          `${testCase.name}: Enter action is outside viewport`);
        assert(layout.action.width >= 44 && layout.action.height >= 44,
          `${testCase.name}: Enter action is below the 44px touch target floor`);

        await page.locator('#explore-threshold-enter').click();
        await page.waitForFunction(() => document.getElementById('explore-threshold')?.hidden === true, {
          timeout: 5_000,
        });
        assert(errors.length === 0, `${testCase.name}: ${errors.join(' | ')}`);
        console.log(`PASS ${testCase.name}: Enter fully visible, clickable, overflowX=${layout.overflowX}`);
      } catch (error) {
        failed += 1;
        console.error(`FAIL ${testCase.name}: ${error.message || error}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (failed) throw new Error(`${failed}/${CASES.length} Explore threshold cases failed`);
  console.log(`${CASES.length}/${CASES.length} Explore threshold cases passed`);
}

main().catch((error) => {
  console.error('[wave4-explore-threshold]', error);
  process.exit(1);
});
