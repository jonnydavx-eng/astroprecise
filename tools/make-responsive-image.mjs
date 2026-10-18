#!/usr/bin/env node
/**
 * Make responsive AVIF + WebP variants of one square-or-rectangular image.
 *
 *   node tools/make-responsive-image.mjs website/img/shop/v906/natal-plate.jpg 400,600,800,1200,1600
 *
 * Writes <name>-<width>.avif and <name>-<width>.webp beside the source, keeps
 * the source aspect ratio, never upscales, and prints a bytes table. Works the
 * same on macOS, Windows and Linux (sharp ships native builds for each).
 */
import sharp from 'sharp';
import { statSync } from 'node:fs';
import { dirname, basename, extname, join } from 'node:path';

const [src, list = '400,800,1200,1600'] = process.argv.slice(2);
if (!src) { console.error('usage: make-responsive-image.mjs <image> [w1,w2,...]'); process.exit(1); }
const meta = await sharp(src).metadata();
const stem = join(dirname(src), basename(src, extname(src)));
const rows = [[src, meta.width, statSync(src).size]];
for (const w of list.split(',').map(Number).filter((n) => n > 0 && n <= meta.width)) {
  const h = Math.round((meta.height * w) / meta.width);
  for (const [fmt, opts] of [['avif', { quality: 52, effort: 6 }], ['webp', { quality: 78, effort: 6 }]]) {
    const out = `${stem}-${w}.${fmt}`;
    await sharp(src).resize(w, h)[fmt](opts).toFile(out);
    rows.push([out, w, statSync(out).size]);
  }
}
for (const [f, w, b] of rows) console.log(`${String(w).padStart(5)}w ${(b / 1024).toFixed(1).padStart(7)} KiB  ${f}`);
