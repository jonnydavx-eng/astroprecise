/**
 * Watch the reading spine on the host GPU (Chrome, no SwiftShader).
 * Usage: node tools/_gpu-reading-watch.mjs
 */
import { chromium } from './visual-check/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = (process.env.AP_BASE || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const out = join(process.cwd(), 'launch-output', 'gpu-reading-watch');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const notes = [];

async function shot(name, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2800);
  const info = await page.evaluate(() => {
    const orr = document.getElementById('orr');
    const q = orr && orr._engine && typeof orr._engine.getVisualQuality === 'function'
      ? orr._engine.getVisualQuality()
      : null;
    return {
      title: document.title,
      h1: (document.querySelector('h1') || {}).textContent || '',
      kicker: (document.getElementById('ap-reading-kicker') || {}).textContent || '',
      body: (document.getElementById('ap-reading-body') || {}).textContent || '',
      webgl: !!(document.querySelector('canvas')),
      quality: q,
    };
  });
  const file = join(out, name + '.png');
  await page.screenshot({ path: file, fullPage: false });
  notes.push({ name, url, file, ...info });
}

try {
  await shot('home', BASE + '/index.html?nosw=1');
  await shot('chart', BASE + '/chart.html?nosw=1');
  await shot('reading', BASE + '/deep-reading.html?nosw=1');
  await page.setViewportSize({ width: 390, height: 844 });
  await shot('home-phone', BASE + '/index.html?nosw=1');
  writeFileSync(join(out, 'notes.json'), JSON.stringify(notes, null, 2));
  console.log(JSON.stringify(notes, null, 2));
} finally {
  await browser.close();
}
