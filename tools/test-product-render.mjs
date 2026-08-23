#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { sha256 } from './fulfil-shared.mjs';

const order = {
  orderId: 'FICTIONAL-RENDER-901', product: 'whole-sky-edition', email: 'sample@example.test',
  name: 'Aurora Vale', place: 'Whitby, England',
  y: 1990, mo: 6, d: 14, h: 3, mi: 42,
  lat: 54.486, lon: -0.613, tz: 'Europe/London', timeAccuracy: 'exact', house: 'placidus',
};
const expected = {
  '01-natal-print-4960x7016.png': [4960, 7016],
  '02-natal-square-2160x2160.png': [2160, 2160],
  '03-natal-story-2160x3840.png': [2160, 3840],
  '04-phone-wallpaper-1080x1920.png': [1080, 1920],
  '05-big-three-1080x1080.png': [1080, 1080],
  '06-observatory-birth-hour-schematic-4800x3600.png': [4800, 3600],
};
const root = mkdtempSync(join(tmpdir(), 'ap-product-render-v901-'));
try {
  const input = join(root, 'fictional-order.json');
  writeFileSync(input, JSON.stringify(order));
  const provenanceRef = 'AP-0123456789ABCDEF';
  const renderEnv = {
    ...process.env,
    AP_STUDIO_INPUT_HASH: sha256(JSON.stringify(order)),
    AP_STUDIO_PROVENANCE_REF: provenanceRef,
    AP_STUDIO_MODE: 'proof',
  };
  for (const [script, args] of [
    ['tools/generate-natal-print-pack.mjs', ['--in', input, '--out', root]],
    ['tools/capture-observatory-still.mjs', ['--in', input, '--out', root]],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: process.cwd(), encoding: 'utf8', timeout: 120_000, env: renderEnv });
    assert.equal(result.status, 0, `${script}\n${result.stdout}\n${result.stderr}`);
  }
  for (const [file, dims] of Object.entries(expected)) {
    const meta = await sharp(join(root, file)).metadata();
    assert.deepEqual([meta.width, meta.height, meta.format], [...dims, 'png'], file);
    const { data } = await sharp(join(root, file))
      .extract({ left: 0, top: dims[1] - 1, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual([...data.slice(0, 3)], [0x8B, 0xA9, 0xFF], `${file} proof watermark marker`);
    const strip = await sharp(join(root, file))
      .extract({ left: 16, top: dims[1] - 28, width: 96 * 8, height: 8 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const bits = [];
    for (let bit = 0; bit < 96; bit++) {
      const offset = (4 * strip.info.width + bit * 8 + 4) * strip.info.channels;
      const blue = strip.data[offset + 2];
      bits.push(blue > 0x80 ? '1' : '0');
    }
    const decoded = bits.join('').match(/.{4}/g).map((chunk) => Number.parseInt(chunk, 2).toString(16).toUpperCase()).join('');
    assert.equal(decoded, `A57A901E${provenanceRef.slice(3)}`, `${file} provenance strip`);
  }
  const stillSource = readFileSync('tools/capture-observatory-still.mjs', 'utf8');
  assert.match(stillSource, /captureBirthHourStill\(\{ jd: captureJd, timeKnown: true, scale: 3 \}\)/);
  assert.match(stillSource, /stampSurfaceA\(canvas, stampContext\)/);
  const chartSource = readFileSync('tools/generate-natal-print-pack.mjs', 'utf8');
  assert.match(chartSource, /ap-chart-restore/);
  assert.match(chartSource, /Chart-page UTC\/JD mismatch/);
  assert.match(chartSource, /FICTIONAL SAMPLE · NOT A CUSTOMER FILE/);
} finally {
  rmSync(root, { recursive: true, force: true });
}
console.log('PASS authentic product renders: five exact chart PNGs + stamped 4800x3600 SCHEMATIC Observatory still');
