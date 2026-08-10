/**
 * Explore live-model/plinth phone gate (AP-V832).
 *
 * Proves that Explore enters the real model without the retired 2D doorway and
 * that its complete control console is in document flow below the canvas — not
 * painted across the Earth — on portrait and short landscape phones.
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
  const launch = { headless: true, args: ['--enable-unsafe-swiftshader'] };
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
      page.on('pageerror', error => errors.push(`page: ${error.message || error}`));
      page.on('console', message => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });

      try {
        await page.goto(`${BASE}/explore.html?nosw=1&model-plinth-check=${testCase.name}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60_000,
        });
        await page.waitForSelector('#apAwardOrreryWrap:not([hidden])', { state: 'visible', timeout: 10_000 });
        await page.waitForSelector('#orrery-lite-deck', { state: 'visible', timeout: 10_000 });
        await page.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, {
          timeout: 20_000,
        });
        await page.waitForTimeout(350);

        const layout = await page.evaluate(() => {
          const rect = element => {
            if (!element) return null;
            const box = element.getBoundingClientRect();
            return { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width, height: box.height };
          };
          const threshold = document.getElementById('explore-threshold');
          const model = document.getElementById('apAwardOrreryWrap');
          const deck = document.getElementById('orrery-lite-deck');
          const canvas = document.getElementById('orrery-canvas');
          const visibleButtons = Array.from(deck?.querySelectorAll('button') || []).filter(button => {
            const box = button.getBoundingClientRect();
            const style = getComputedStyle(button);
            return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
          });
          return {
            viewport: { width: innerWidth, height: innerHeight },
            overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            thresholdVisible: !!threshold && !threshold.hidden && getComputedStyle(threshold).display !== 'none',
            stage: rect(document.getElementById('explore-stage')),
            model: rect(model),
            deck: rect(deck),
            canvas: rect(canvas),
            canvasPixels: canvas ? { width: canvas.width, height: canvas.height } : null,
            full: document.documentElement.classList.contains('orrery-full'),
            minButton: visibleButtons.length ? {
              width: Math.min(...visibleButtons.map(button => button.getBoundingClientRect().width)),
              height: Math.min(...visibleButtons.map(button => button.getBoundingClientRect().height)),
            } : null,
          };
        });

        assert(layout.full, `${testCase.name}: WebGL did not become the entry model`);
        assert(!layout.thresholdVisible, `${testCase.name}: retired 2D doorway is visible`);
        assert(layout.stage && layout.model && layout.deck && layout.canvas, `${testCase.name}: stage geometry missing`);
        assert(layout.overflowX <= 0, `${testCase.name}: horizontal overflow ${layout.overflowX}px`);
        assert(layout.model.height >= 498, `${testCase.name}: model stage collapsed to ${layout.model.height}px`);
        assert(layout.deck.top >= layout.model.bottom - 1,
          `${testCase.name}: deck overlaps model by ${(layout.model.bottom - layout.deck.top).toFixed(1)}px`);
        assert(layout.canvas.top >= layout.model.top - 1 && layout.canvas.bottom <= layout.model.bottom + 1,
          `${testCase.name}: canvas escaped its model row`);
        assert(layout.canvasPixels && layout.canvasPixels.width > 0 && layout.canvasPixels.height > 0,
          `${testCase.name}: model canvas has no render pixels`);
        assert(layout.minButton && layout.minButton.height >= 40,
          `${testCase.name}: visible deck button height fell below 40px (${layout.minButton?.height || 0}px)`);
        assert(errors.length === 0, `${testCase.name}: ${errors.join(' | ')}`);
        console.log(`PASS ${testCase.name}: WebGL entry, model=${layout.model.height.toFixed(0)}px, overlap=0, overflowX=${layout.overflowX}`);
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

  if (failed) throw new Error(`${failed}/${CASES.length} Explore live-model/plinth cases failed`);
  console.log(`${CASES.length}/${CASES.length} Explore live-model/plinth cases passed`);
}

main().catch(error => {
  console.error('[wave4-explore-model-plinth]', error);
  process.exit(1);
});
