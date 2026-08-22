/**
 * Chart → sitting continuity regression.
 *
 * The legacy filename is retained for package.json. Chart no longer boots a
 * second WebGL context: it owns an authored Surface A still, a real SVG wheel,
 * and a private same-tab handoff into the seven-chapter sitting.
 */
import { chromium } from './node_modules/playwright/index.mjs';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const BASE = (process.env.AP_BASE || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const OUT = process.env.AP_VISUAL_OUT || join(tmpdir(), 'astroprecise-v899-ui');
const WINDOWS_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const errors = [];
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const launch = { headless: true, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] };
  if (existsSync(WINDOWS_CHROME)) launch.executablePath = WINDOWS_CHROME;
  browser = await chromium.launch(launch);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`PAGEERROR ${error.message || error}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`CONSOLE ${message.text()}`);
  });

  await page.goto(`${BASE}/chart.html?nosw=1&contract=v899-chart-sitting`, {
    waitUntil: 'domcontentloaded', timeout: 60_000,
  });
  await page.waitForSelector('.ap-surface-a img', { state: 'visible', timeout: 15_000 });
  assert(await page.locator('void-orrery').count() === 0 && await page.locator('canvas').count() === 0,
    'Chart must not own a live WebGL context');
  assert(await page.locator('#date-input').getAttribute('min') === '1800-01-01' &&
    await page.locator('#date-input').getAttribute('max') === '2200-12-31',
    'Chart date control does not declare the 1800–2200 support window');

  await page.locator('#calculate-btn').click();
  assert(await page.locator('#date-input').getAttribute('aria-invalid') === 'true',
    'Invalid birth date was not exposed with aria-invalid');

  await page.locator('#sample-btn').click();
  await page.waitForSelector('#chart-result:not(.hidden)', { state: 'visible', timeout: 20_000 });
  await page.waitForSelector('#natal-wheel svg', { state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(500);

  const chartState = await page.evaluate(() => {
    const handoff = JSON.parse(sessionStorage.getItem('ap-sitting-handoff') || 'null');
    const glyphs = Array.from(document.querySelectorAll('#natal-wheel .planet-glyph'));
    const labels = glyphs.map(glyph => glyph.getAttribute('data-accessible-label') || '');
    const bridge = document.querySelector('#ap-chart-sky-bridge [data-ap-model-link="chart-cast"]');
    const picker = document.getElementById('chart-wheel-picker');
    const pickerRect = picker?.getBoundingClientRect();
    return {
      planetCount: glyphs.length,
      wheelTabStops: document.querySelectorAll('#natal-wheel [tabindex="0"]').length,
      accessibleLabels: labels.filter(label => / at \d+°\d{2}'$/.test(label)).length,
      hitTargets: document.querySelectorAll('#natal-wheel .planet-glyph__hit').length,
      leaders: document.querySelectorAll('#natal-wheel .planet-glyph__leader').length,
      degreeLabels: document.querySelectorAll('#natal-wheel .planet-glyph__degree').length,
      aspects: document.querySelectorAll('#natal-wheel .aspect-line').length,
      pickerDisabled: picker?.disabled,
      pickerHeight: pickerRect?.height || 0,
      pickerOptions: picker?.options.length || 0,
      pickerNodes: Array.from(picker?.options || []).filter(option => /^(North Node|South Node)$/.test(option.text)).map(option => option.text),
      svgRole: document.querySelector('#natal-wheel svg')?.getAttribute('role'),
      svgLabel: document.querySelector('#natal-wheel svg')?.getAttribute('aria-label'),
      resultRegionLabel: document.getElementById('chart-result')?.getAttribute('aria-labelledby'),
      visibleH1s: Array.from(document.querySelectorAll('h1')).filter(node => node.getClientRects().length > 0).length,
      resultDate: document.getElementById('result-date')?.textContent.trim(),
      resultTimeChip: document.getElementById('result-time-chip')?.textContent.trim(),
      resultPrecision: document.getElementById('result-precision-label')?.textContent.trim(),
      bridgeHref: bridge?.getAttribute('href'),
      bridgeText: bridge?.textContent.trim(),
      handoff: handoff && {
        houseSystem: handoff.houseSystem,
        timeAccuracy: handoff.timeAccuracy,
        nodeMode: handoff.nodeMode,
        positions: Boolean(handoff.positions),
        houses: handoff.houses?.length || 0,
        planetHouses: Object.keys(handoff.planetHouses || {}).length,
        asc: handoff.asc,
        mc: handoff.mc,
        jd: handoff.jd,
      },
      localKeys: Object.keys(localStorage),
      resultName: document.querySelector('.result-name')?.textContent.trim() ||
        document.querySelector('.result-header-meta')?.textContent.trim(),
    };
  });

  assert(chartState.planetCount >= 10, `Wheel rendered too few bodies: ${JSON.stringify(chartState)}`);
  assert(chartState.wheelTabStops === 0 && chartState.pickerDisabled === false &&
    chartState.pickerHeight >= 44 && chartState.pickerOptions > chartState.planetCount &&
    chartState.pickerNodes.length === 2 &&
    chartState.accessibleLabels === chartState.planetCount &&
    chartState.hitTargets === chartState.planetCount,
    `Wheel did not expose its single full-size accessible control model: ${JSON.stringify(chartState)}`);
  assert(chartState.svgRole === 'img' && /natal wheel/i.test(chartState.svgLabel || '') &&
    chartState.resultRegionLabel === 'result-name' && chartState.visibleH1s === 1,
    `Dynamic result does not have a valid heading/region/wheel name: ${JSON.stringify(chartState)}`);
  assert(/1907-07-06 at 08:30/.test(chartState.resultDate || '') && chartState.resultTimeChip === 'Exact time' &&
    /Exact time/.test(chartState.resultPrecision || ''),
    `Visible result receipt is incomplete: ${JSON.stringify(chartState)}`);
  assert(chartState.leaders > 0 && chartState.degreeLabels < chartState.planetCount,
    `Dense wheel does not expose exact-position leaders and decluttered labels: ${JSON.stringify(chartState)}`);
  assert(chartState.aspects > 0, 'Wheel rendered no aspect geometry');
  assert(chartState.bridgeHref === 'index.html#focus=earth' && /See your sky in the model/.test(chartState.bridgeText || ''),
    `Chart did not mount the privacy-safe Observatory bridge: ${JSON.stringify(chartState)}`);
  assert(chartState.handoff?.houseSystem === 'equal' && chartState.handoff?.timeAccuracy === 'exact' &&
    chartState.handoff?.nodeMode === 'mean' && chartState.handoff?.positions &&
    chartState.handoff?.houses === 12 && chartState.handoff?.planetHouses >= 10 &&
    Number.isFinite(chartState.handoff?.asc) && Number.isFinite(chartState.handoff?.mc) &&
    Number.isFinite(chartState.handoff?.jd),
    `Chart handoff dropped computed data: ${JSON.stringify(chartState.handoff)}`);
  assert(chartState.localKeys.length === 0,
    `Casting a chart silently wrote persistent browser storage: ${chartState.localKeys.join(', ')}`);

  const exactA11y = await new AxeBuilder({ page }).analyze();
  assert(exactA11y.violations.length === 0,
    `Dynamic exact chart has axe violations: ${JSON.stringify(exactA11y.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, html: n.html, failure: n.failureSummary })) })))}`);

  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: join(OUT, 'chart-result-desktop.png'), fullPage: false });

  // Switch after the cast, then change the node model. Both controls must share
  // one chart state so the node re-cast cannot silently revert Placidus.
  const housesTab = page.locator('#tab-houses-btn');
  await housesTab.scrollIntoViewIfNeeded();
  await housesTab.click();
  await page.waitForFunction(() => document.getElementById('tab-houses-btn')?.getAttribute('aria-selected') === 'true');
  const placidus = page.locator('[data-house-system="placidus"]');
  await placidus.scrollIntoViewIfNeeded();
  await placidus.click();
  await page.waitForFunction(() => document.querySelector('[data-house-system="placidus"]')?.classList.contains('is-active'));
  await page.evaluate(() => {
    const radio = document.querySelector('input[name="node-mode"][value="true"]');
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const handoff = JSON.parse(sessionStorage.getItem('ap-sitting-handoff') || 'null');
    return handoff?.houseSystem === 'placidus' && handoff?.nodeMode === 'true';
  }, null, { timeout: 20_000 });

  const methodState = await page.evaluate(() => {
    const handoff = JSON.parse(sessionStorage.getItem('ap-sitting-handoff') || 'null');
    return {
      formHouseSystem: document.getElementById('house-system')?.value,
      resultHouseActive: document.querySelector('[data-house-system="placidus"]')?.classList.contains('is-active'),
      resultPrecision: document.getElementById('result-precision-label')?.textContent.trim(),
      nodeReceipt: document.querySelector('#planets-table .ap-reading-card__meta--centered')?.textContent.trim(),
      handoff: handoff && { houseSystem: handoff.houseSystem, nodeMode: handoff.nodeMode, timeAccuracy: handoff.timeAccuracy },
    };
  });
  assert(methodState.formHouseSystem === 'placidus' && methodState.resultHouseActive === true &&
    /Placidus houses/.test(methodState.resultPrecision || '') && /True \(osculating\) node/.test(methodState.nodeReceipt || '') &&
    methodState.handoff?.houseSystem === 'placidus' && methodState.handoff?.nodeMode === 'true',
    `House/node state diverged across form, receipt, and handoff: ${JSON.stringify(methodState)}`);

  await page.locator('#sitting-cta').click();
  await page.waitForURL(/deep-reading\.html\?from=chart$/, { timeout: 15_000 });
  await page.waitForSelector('#natalResult:not([hidden])', { state: 'visible', timeout: 20_000 });
  await page.waitForTimeout(300);

  const sitting = await page.evaluate(() => {
    const box = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    };
    const logo = document.querySelector('.navbar__logo');
    const logoIcon = logo?.querySelector('.navbar__logo-icon');
    const logoText = logo?.querySelector('.logo-text');
    let firstGlyph = null;
    if (logoText?.firstChild?.nodeType === Node.TEXT_NODE && logoText.firstChild.textContent.length) {
      const range = document.createRange();
      range.setStart(logoText.firstChild, 0);
      range.setEnd(logoText.firstChild, 1);
      const rect = range.getBoundingClientRect();
      firstGlyph = { left: rect.left, right: rect.right, width: rect.width };
    }
    return {
      receipt: document.getElementById('natalReceipt')?.innerText || '',
      meta: document.getElementById('natalMeta')?.innerText || '',
      chapters: document.querySelectorAll('.ap-natal-ch').length,
      firstChapter: document.querySelector('.ap-natal-ch h2')?.textContent.trim(),
      observatoryHref: document.getElementById('natalObservatoryLink')?.getAttribute('href'),
      models: document.querySelectorAll('void-orrery').length,
      canvases: document.querySelectorAll('canvas').length,
      withheldHidden: document.getElementById('natalWithheld')?.hidden,
      unlockNote: document.getElementById('natalUnlockNote')?.innerText || '',
      supportHref: document.querySelector('.ap-support-after-value a')?.getAttribute('href'),
      localEntries: Object.fromEntries(Object.entries(localStorage)),
      url: location.href,
      wordmark: {
        text: logoText?.textContent.trim() || '',
        viewportWidth: window.innerWidth,
        scrollX: window.scrollX,
        documentWidth: document.documentElement.scrollWidth,
        logo: box(logo),
        icon: box(logoIcon),
        textBox: box(logoText),
        firstGlyph,
        overflow: logo ? getComputedStyle(logo).overflow : '',
        clipPath: logo ? getComputedStyle(logo).clipPath : '',
      },
    };
  });

  assert(/HOUSE METHOD\s+Placidus/i.test(sitting.receipt) &&
    /TIME\s+08:30 · exact/i.test(sitting.receipt) &&
    /Placidus houses\. House placements were carried from the computed chart without changing method\./i.test(sitting.meta),
    `Sitting changed or obscured the just-cast chart method: ${JSON.stringify(sitting)}`);
  assert(sitting.chapters === 7 && Boolean(sitting.firstChapter),
    `Sitting did not render seven chapters: ${JSON.stringify(sitting)}`);
  assert(sitting.models === 0 && sitting.canvases === 0,
    'Sitting must remain a Surface A reading, not a second WebGL owner');
  assert(sitting.wordmark.text === 'AstroPrecise' && sitting.wordmark.scrollX === 0 &&
    sitting.wordmark.documentWidth <= sitting.wordmark.viewportWidth + 1 &&
    sitting.wordmark.logo?.left >= 24 && sitting.wordmark.textBox?.left >= sitting.wordmark.icon?.right + 6 &&
    sitting.wordmark.textBox?.right <= sitting.wordmark.viewportWidth - 24 &&
    sitting.wordmark.firstGlyph?.left >= sitting.wordmark.textBox?.left - 1 &&
    sitting.wordmark.firstGlyph?.width >= 8 && sitting.wordmark.overflow === 'visible' &&
    sitting.wordmark.clipPath === 'none',
    `Sitting wordmark is clipped or the page is horizontally displaced: ${JSON.stringify(sitting.wordmark)}`);
  assert(sitting.observatoryHref === 'index.html#focus=earth' && !/[?&](?:dob|tob|tz|birth)/i.test(sitting.url),
    `Sitting exposed birth details in its URL or lost the model bridge: ${JSON.stringify(sitting)}`);
  assert(sitting.withheldHidden === true,
    'Exact-time sitting incorrectly displayed the unknown/provisional warning');
  assert(/not open/i.test(sitting.unlockNote) && /Checkout is not connected/i.test(sitting.unlockNote) &&
    sitting.supportHref === 'https://ko-fi.com/astroprecise',
    `Sitting commerce state is not truthful: ${JSON.stringify(sitting)}`);
  const allowedPreferenceKeys = new Set(['ap_node_mode', 'ap_time_accuracy', 'ap_chart_draft_v1']);
  assert(Object.keys(sitting.localEntries).every(key => allowedPreferenceKeys.has(key)) &&
    sitting.localEntries.ap_node_mode === 'true' && !Object.keys(sitting.localEntries).some(key => /saved.?chart/i.test(key)),
    `Opening the sitting created an unexpected saved-chart record: ${JSON.stringify(sitting.localEntries)}`);
  assert(errors.length === 0, errors.join('\n'));

  await page.screenshot({ path: join(OUT, 'sitting-result-desktop.png'), fullPage: false });

  // Approximate-time contract: the provisional state must be visible beside
  // the date, programmatically associated with the wheel, and repeated by the
  // full-size wheel picker rather than buried in closed chart details.
  const approxContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const approxPage = await approxContext.newPage();
  approxPage.on('pageerror', error => errors.push(`APPROX PAGEERROR ${error.message || error}`));
  approxPage.on('console', message => {
    if (message.type() === 'error') errors.push(`APPROX CONSOLE ${message.text()}`);
  });
  await approxPage.goto(`${BASE}/chart.html?nosw=1&contract=v899-chart-approximate`, {
    waitUntil: 'domcontentloaded', timeout: 60_000,
  });
  await approxPage.locator('#sample-btn').click();
  await approxPage.waitForSelector('#chart-result:not(.hidden) #natal-wheel svg', { state: 'visible', timeout: 20_000 });
  await approxPage.evaluate(() => {
    document.querySelector('.time-btn[data-time="09:00"]')?.click();
    document.getElementById('chart-form')?.requestSubmit();
  });
  await approxPage.waitForFunction(() => {
    const handoff = JSON.parse(sessionStorage.getItem('ap-sitting-handoff') || 'null');
    return handoff?.timeAccuracy === 'approximate';
  }, null, { timeout: 20_000 });
  await approxPage.waitForFunction(() => document.querySelector('#natal-wheel svg')?.getAttribute('aria-label')?.includes('provisional'));

  const approxState = await approxPage.evaluate(() => {
    const chip = document.getElementById('result-time-chip');
    const picker = document.getElementById('chart-wheel-picker');
    const wheel = document.getElementById('natal-wheel');
    const svg = wheel?.querySelector('svg');
    return {
      chipText: chip?.textContent.trim(),
      chipVisible: chip ? getComputedStyle(chip).display !== 'none' : false,
      chipBesideDate: chip?.parentElement?.classList.contains('result-date-line'),
      resultLevel: document.getElementById('chart-result')?.dataset.timeAccuracy,
      wheelLevel: wheel?.dataset.timeAccuracy,
      wheelDescribedBy: wheel?.getAttribute('aria-describedby'),
      wheelLabel: wheel?.getAttribute('aria-label'),
      svgLabel: svg?.getAttribute('aria-label'),
      svgDescribedBy: svg?.getAttribute('aria-describedby'),
      pickerHeight: picker?.getBoundingClientRect().height || 0,
      pickerDescription: document.getElementById('chart-wheel-control-hint')?.textContent.trim(),
      wheelTabStops: wheel?.querySelectorAll('[tabindex="0"]').length || 0,
      provisionalHouseNote: Boolean(document.querySelector('#houses-table .ap-withheld-card--provisional')),
      handoff: JSON.parse(sessionStorage.getItem('ap-sitting-handoff') || 'null'),
    };
  });
  assert(approxState.chipVisible && approxState.chipBesideDate &&
    approxState.chipText === 'Approximate time · provisional' &&
    approxState.resultLevel === 'approximate' && approxState.wheelLevel === 'approximate' &&
    /result-time-chip/.test(approxState.wheelDescribedBy || '') &&
    /provisional/i.test(approxState.wheelLabel || '') && /provisional/i.test(approxState.svgLabel || '') &&
    /result-time-chip/.test(approxState.svgDescribedBy || '') &&
    approxState.pickerHeight >= 44 && /provisional/i.test(approxState.pickerDescription || '') &&
    approxState.wheelTabStops === 0 && approxState.provisionalHouseNote &&
    approxState.handoff?.timeAccuracy === 'approximate',
    `Approximate result did not expose one associated provisional state: ${JSON.stringify(approxState)}`);

  await approxPage.locator('#chart-wheel-picker').selectOption('planet:NorthNode');
  await approxPage.waitForSelector('#chart-wheel-reading:not([hidden])', { state: 'visible', timeout: 10_000 });
  const nodeTitle = await approxPage.locator('#chart-wheel-reading-title').textContent();
  assert(/North Node/.test(nodeTitle || '') && !/NorthNode/.test(nodeTitle || ''),
    `Wheel picker exposed an internal node key: ${nodeTitle}`);

  const approximateA11y = await new AxeBuilder({ page: approxPage }).analyze();
  assert(approximateA11y.violations.length === 0,
    `Dynamic approximate chart has axe violations: ${JSON.stringify(approximateA11y.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, html: n.html, failure: n.failureSummary })) })))}`);
  await approxPage.screenshot({ path: join(OUT, 'chart-result-approximate-phone.png'), fullPage: false });
  await approxContext.close();
  assert(errors.length === 0, errors.join('\n'));

  console.log(JSON.stringify({
    result: 'PASS',
    wheel: {
      planets: chartState.planetCount,
      aspects: chartState.aspects,
      collisionLeaders: chartState.leaders,
      visibleDegreeLabels: chartState.degreeLabels,
      accessiblePickerHeight: chartState.pickerHeight,
      svgTabStops: chartState.wheelTabStops,
    },
    handoff: chartState.handoff,
    sitting: {
      chapters: sitting.chapters,
      method: 'Placidus',
      timeAccuracy: 'exact',
      observatoryHref: sitting.observatoryHref,
      wordmark: sitting.wordmark,
    },
    approximate: {
      chip: approxState.chipText,
      pickerHeight: approxState.pickerHeight,
      axeViolations: approximateA11y.violations.length,
    },
    exactAxeViolations: exactA11y.violations.length,
    screenshots: OUT,
  }, null, 2));
} finally {
  if (browser) await browser.close();
}
