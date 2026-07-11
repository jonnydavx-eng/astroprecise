import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', (e) => logs.push(String(e)));
page.on('response', (r) => { if (r.status() >= 400) logs.push(`${r.status()} ${r.url()}`); });

await page.goto('http://localhost:8790/chart.html', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForFunction(() => typeof window.AstroEphemeris !== 'undefined', null, { timeout: 30000 });

// Sample chart path
await page.click('#sample-btn');
await page.waitForTimeout(8000);

const out = await page.evaluate(() => ({
  resultHidden: document.getElementById('chart-result')?.classList.contains('hidden'),
  wheelSvg: !!document.querySelector('#natal-wheel svg'),
  placeholder: !!document.querySelector('#natal-wheel .ap-wheel-placeholder'),
  bigThree: [...document.querySelectorAll('.big-three-card__sign')].map((e) => e.textContent),
  resultName: document.getElementById('result-name')?.textContent,
  wheelInner: document.getElementById('natal-wheel')?.innerHTML?.includes('natal-chart'),
  tabPanels: document.querySelectorAll('.chart-tab-panel').length,
  loadingHidden: document.getElementById('chart-loading')?.classList.contains('hidden'),
}));

console.log(JSON.stringify({ out, logs: [...new Set(logs)] }, null, 2));
await page.screenshot({ path: 'out/chart-sample.png', fullPage: true });
await browser.close();