import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:8790/chart.html', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForFunction(() => typeof window.AstroEphemeris !== 'undefined', null, { timeout: 30000 });
await page.click('#sample-btn');
await page.waitForTimeout(8000);

const out = await page.evaluate(() => {
  const q = (sel) => document.querySelector(sel);
  const cs = (el) => el ? getComputedStyle(el) : null;
  const overview = q('#tab-overview');
  const analysis = q('#analysis-content');
  const grid = q('.chart-results-grid');
  const wheel = q('#natal-wheel');
  return {
    analysisLen: analysis?.innerHTML?.length || 0,
    analysisPreview: analysis?.textContent?.trim()?.slice(0, 200),
    overviewHidden: overview?.getAttribute('aria-hidden'),
    overviewDisplay: cs(overview)?.display,
    overviewHeight: overview?.offsetHeight,
    gridDisplay: cs(grid)?.display,
    gridTemplate: cs(grid)?.gridTemplateColumns,
    wheelHeight: wheel?.offsetHeight,
    wheelDisplay: cs(wheel)?.display,
    chartCssLoaded: !!document.getElementById('ap-css-chart'),
    planetsLen: q('#planets-table')?.innerHTML?.length || 0,
    aspectsLen: q('#aspects-table')?.innerHTML?.length || 0,
    whatsNextHidden: q('#chart-whats-next')?.hidden,
    formHidden: q('#chart-form-wrapper')?.style?.display,
  };
});
console.log(JSON.stringify(out, null, 2));
await page.locator('#natal-wheel').scrollIntoViewIfNeeded();
await page.screenshot({ path: 'out/chart-wheel-view.png' });
await browser.close();