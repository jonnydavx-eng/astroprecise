#!/usr/bin/env node
/**
 * Generate WebP variants for shop LCP / above-fold product previews.
 * Run: node tools/compress-shop-lcp.mjs
 */
import { spawnSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const TOOLS = dirname(fileURLToPath(import.meta.url));
const SHOP_IMG = join(TOOLS, '../img/shop');

const TARGETS = [
  { jpg: 'product-deep-reading.jpg', maxW: 960, quality: 82 },
  { jpg: 'product-bundle.jpg', maxW: 800, quality: 80 },
  { jpg: 'product-poster-pdf.jpg', maxW: 800, quality: 80 },
];

function kb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

function hasFfmpeg() {
  return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
}

function toWebp(input, output, maxW, quality) {
  const args = [
    '-y', '-i', input,
    '-vf', `scale='min(${maxW},iw)':-2`,
    '-c:v', 'libwebp',
    '-quality', String(quality),
    output,
  ];
  const r = spawnSync('ffmpeg', args, { stdio: 'pipe', encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(r.stderr || `ffmpeg failed for ${input}`);
  }
}

function main() {
  if (!hasFfmpeg()) {
    console.error('ffmpeg not found — install ffmpeg to generate shop WebPs');
    process.exit(1);
  }

  for (const t of TARGETS) {
    const input = join(SHOP_IMG, t.jpg);
    if (!existsSync(input)) {
      console.warn('skip missing:', t.jpg);
      continue;
    }
    const webpName = t.jpg.replace(/\.jpe?g$/i, '.webp');
    const output = join(SHOP_IMG, webpName);
    const before = statSync(input).size;
    toWebp(input, output, t.maxW, t.quality);
    const after = statSync(output).size;
    const pct = Math.round((1 - after / before) * 100);
    console.log(`${webpName}: ${kb(before)}KB → ${kb(after)}KB (−${pct}%)`);
  }
}

main();