#!/usr/bin/env node
/** Build the three authentic raster inputs consumed by the Illustrator cover kit. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';
import sharp from 'sharp';
import { ROOT, sha256 } from './fulfil-shared.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ORDER = {
  orderId: 'FICTIONAL-SHOP-SAMPLE-901', product: 'whole-sky-edition', email: 'sample@example.test',
  sampleMode: 'fictional',
  name: 'Aurora Vale', place: 'Whitby, England',
  y: 1990, mo: 6, d: 14, h: 3, mi: 42,
  lat: 54.486, lon: -0.613, tz: 'Europe/London', timeAccuracy: 'exact', house: 'placidus',
};

function edgePath() {
  const candidates = [process.env.AP_EDGE_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('Microsoft Edge not found; set AP_EDGE_PATH');
  return found;
}

async function main() {
  const root = resolve(ROOT, 'output', 'shop-studio-v901');
  const proof = join(root, 'proof');
  const personal = join(root, 'personal-cover');
  const inputs = join(root, 'cover-inputs');
  mkdirSync(proof, { recursive: true });
  mkdirSync(personal, { recursive: true });
  mkdirSync(inputs, { recursive: true });
  const orderPath = join(proof, 'fictional-order.json');
  writeFileSync(orderPath, JSON.stringify(ORDER, null, 2) + '\n');
  const result = spawnSync(process.execPath, ['tools/fulfil-order.mjs', '--in', orderPath, '--proof', '--out', proof], {
    cwd: ROOT, encoding: 'utf8', timeout: 180_000,
  });
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  const personalResult = spawnSync(process.execPath, ['tools/generate-reading.mjs', '--product', 'personal-sky-keepsake', '--out', personal], {
    cwd: ROOT, encoding: 'utf8', timeout: 60_000,
  });
  if (personalResult.status !== 0) throw new Error(`${personalResult.stdout}\n${personalResult.stderr}`);
  const readingHtml = readdirSync(personal).find((name) => name.startsWith('reading-') && name.endsWith('.html'));
  if (!readingHtml) throw new Error('Proof reading HTML missing');
  const html = readFileSync(join(personal, readingHtml), 'utf8').replace(/<head>/i, `<head><base href="${pathToFileURL(join(ROOT, 'website') + '/').href}">`);
  const browser = await chromium.launch({ executablePath: edgePath(), headless: true });
  const context = await browser.newContext({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  try {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
    await page.locator('.page.cover').screenshot({ path: join(inputs, 'aurora-vale-reading-cover.png') });
  } finally {
    await context.close();
    await browser.close();
  }
  copyFileSync(join(proof, '02-natal-square-2160x2160.png'), join(inputs, 'aurora-vale-chart-square-2160.png'));
  await sharp(join(proof, '06-observatory-birth-hour-schematic-4800x3600.png'))
    .resize(1374, 660, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 1.85, saturation: 1.18 })
    .linear(1.20, 18)
    .png({ compressionLevel: 9 })
    .toFile(join(inputs, 'aurora-vale-observatory-still.png'));
  const files = ['aurora-vale-chart-square-2160.png', 'aurora-vale-reading-cover.png', 'aurora-vale-observatory-still.png'];
  const manifest = {
    schema: 'astroprecise-shop-cover-inputs-v901',
    fixture: 'fictional Aurora Vale sample',
    generator: 'tools/generate-shop-assets.mjs',
    files: files.map((file) => {
      const bytes = readFileSync(join(inputs, file));
      return { file, bytes: bytes.length, sha256: sha256(bytes) };
    }),
    rules: ['Every marketplace cover must say SAMPLE', 'The Observatory tile must say SCHEMATIC 3D STILL', 'Observatory cover crop is exposure-adjusted from the real schematic capture', 'No synthetic chart geometry'],
  };
  writeFileSync(join(inputs, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`cover inputs ready: ${inputs}`);
}

main().catch((error) => {
  console.error(`Shop asset generation failed: ${error.message}`);
  process.exit(1);
});
