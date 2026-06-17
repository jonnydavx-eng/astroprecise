#!/usr/bin/env node
/**
 * Convert sign hero JPGs to WebP (~80% quality) alongside originals.
 * Run from repo root:  node website/tools/convert-sign-heroes.mjs
 * Input:  website/assets/images/zodiac-cards/*.jpg
 * Output: website/assets/images/zodiac-cards/*.webp
 */

import { readdirSync, statSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';

const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));
const CARDS_DIR = join(TOOLS_DIR, '../assets/images/zodiac-cards');
const QUALITY = 80;

function kb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default;
  } catch {
    return null;
  }
}

function convertWithFfmpeg(jpgPath, webpPath) {
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-i', jpgPath, '-c:v', 'libwebp', '-quality', String(QUALITY), webpPath],
    { stdio: 'pipe', encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || 'ffmpeg failed');
  }
}

async function convertWithSharp(sharp, jpgPath, webpPath) {
  await sharp(jpgPath).webp({ quality: QUALITY }).toFile(webpPath);
}

async function main() {
  const sharp = await loadSharp();
  const encoder = sharp ? 'sharp' : 'ffmpeg';
  if (!sharp) {
    const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'pipe' });
    if (probe.status !== 0) {
      console.error('Install sharp (npm install in website/tools) or ffmpeg on PATH.');
      process.exit(1);
    }
  }

  const jpgs = readdirSync(CARDS_DIR)
    .filter((f) => f.endsWith('.jpg'))
    .sort();

  if (!jpgs.length) {
    console.error(`No JPGs found in ${CARDS_DIR}`);
    process.exit(1);
  }

  console.log(`Converting ${jpgs.length} sign heroes → WebP (quality ${QUALITY}) via ${encoder}\n`);

  let heaviest = { name: '', jpg: 0, webp: 0 };

  for (const file of jpgs) {
    const jpgPath = join(CARDS_DIR, file);
    const webpPath = join(CARDS_DIR, file.replace(/\.jpg$/i, '.webp'));
    const jpgSize = statSync(jpgPath).size;

    if (sharp) {
      await convertWithSharp(sharp, jpgPath, webpPath);
    } else {
      convertWithFfmpeg(jpgPath, webpPath);
    }

    const webpSize = statSync(webpPath).size;
    const saved = ((1 - webpSize / jpgSize) * 100).toFixed(1);
    console.log(`  ${basename(file, '.jpg').padEnd(12)} ${kb(jpgSize)} KB → ${kb(webpSize)} KB  (−${saved}%)`);

    if (jpgSize > heaviest.jpg) {
      heaviest = { name: basename(file, '.jpg'), jpg: jpgSize, webp: webpSize };
    }
  }

  console.log(`\nHeaviest: ${heaviest.name} — JPG ${kb(heaviest.jpg)} KB → WebP ${kb(heaviest.webp)} KB`);
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});