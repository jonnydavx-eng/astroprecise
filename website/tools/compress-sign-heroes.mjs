#!/usr/bin/env node
/**
 * Re-compress sign hero WebPs for LCP (target < 95 KB each).
 * Run from repo root:  node website/tools/compress-sign-heroes.mjs
 *
 * Input/output: website/assets/images/zodiac-cards/*.webp (in-place overwrite)
 * JPG originals are never touched.
 *
 * Encoder priority: sharp → ffmpeg → ImageMagick magick
 * Settings: max width 460px, quality 78→72 until under 95 KB
 */

import { readdirSync, statSync, renameSync, unlinkSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));
const CARDS_DIR = join(TOOLS_DIR, '../assets/images/zodiac-cards');
const MAX_WIDTH = 460;
const TARGET_KB = 95;
const QUALITY_START = 78;
const QUALITY_MIN = 72;

function kb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

async function loadSharp() {
  try {
    const mod = await import('sharp');
    const sharp = mod.default;
    await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .webp({ quality: 80 })
      .toBuffer();
    return sharp;
  } catch {
    return null;
  }
}

function probeEncoder(name, args) {
  const result = spawnSync(name, args, { stdio: 'pipe', encoding: 'utf8' });
  return result.status === 0;
}

function resolveEncoder(sharp) {
  if (sharp) return { name: 'sharp', tool: 'sharp' };
  if (probeEncoder('ffmpeg', ['-version'])) return { name: 'ffmpeg', tool: 'ffmpeg' };
  if (probeEncoder('magick', ['-version'])) return { name: 'imagemagick', tool: 'magick' };
  return null;
}

async function compressWithSharp(sharp, inputPath, outputPath, quality) {
  await sharp(inputPath)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toFile(outputPath);
}

function compressWithFfmpeg(inputPath, outputPath, quality) {
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      inputPath,
      '-vf',
      `scale='min(${MAX_WIDTH},iw)':-1`,
      '-c:v',
      'libwebp',
      '-quality',
      String(quality),
      outputPath,
    ],
    { stdio: 'pipe', encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || 'ffmpeg failed');
  }
}

function compressWithMagick(inputPath, outputPath, quality) {
  const result = spawnSync(
    'magick',
    [inputPath, '-resize', `${MAX_WIDTH}x>`, '-quality', String(quality), outputPath],
    { stdio: 'pipe', encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || 'magick failed');
  }
}

async function compressOne(encoder, sharp, inputPath, outputPath, quality) {
  if (encoder.tool === 'sharp') {
    await compressWithSharp(sharp, inputPath, outputPath, quality);
  } else if (encoder.tool === 'ffmpeg') {
    compressWithFfmpeg(inputPath, outputPath, quality);
  } else {
    compressWithMagick(inputPath, outputPath, quality);
  }
}

function tempOutputPath(webpPath) {
  return join(tmpdir(), `ap-hero-${basename(webpPath, '.webp')}-${Date.now()}.webp`);
}

async function compressToTarget(encoder, sharp, webpPath) {
  let quality = QUALITY_START;
  let lastError = null;

  while (quality >= QUALITY_MIN) {
    const tmpPath = tempOutputPath(webpPath);
    try {
      await compressOne(encoder, sharp, webpPath, tmpPath, quality);
      const size = statSync(tmpPath).size;
      if (size <= TARGET_KB * 1024 || quality === QUALITY_MIN) {
        return { tmpPath, quality, size };
      }
      unlinkSync(tmpPath);
      quality -= 2;
    } catch (err) {
      lastError = err;
      try {
        unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
      throw err;
    }
  }

  throw lastError || new Error('compression failed');
}

async function main() {
  const sharp = await loadSharp();
  const encoder = resolveEncoder(sharp);

  if (!encoder) {
    console.error(
      [
        'No image encoder available.',
        'Fallback options:',
        '  1. npm install in website/tools (sharp; may need wasm on win32-arm64)',
        '  2. ffmpeg on PATH (winget install Gyan.FFmpeg)',
        '  3. ImageMagick on PATH (winget install ImageMagick.ImageMagick)',
        '  4. cwebp (libwebp tools) — not auto-detected; use ffmpeg/magick instead',
      ].join('\n'),
    );
    process.exit(1);
  }

  const webps = readdirSync(CARDS_DIR)
    .filter((f) => f.endsWith('.webp'))
    .sort();

  if (!webps.length) {
    console.error(`No WebPs found in ${CARDS_DIR}`);
    process.exit(1);
  }

  console.log(
    `Compressing ${webps.length} sign hero WebPs via ${encoder.name}`,
    `(max width ${MAX_WIDTH}px, quality ${QUALITY_START}→${QUALITY_MIN}, target ≤${TARGET_KB} KB)\n`,
  );

  const rows = [];
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of webps) {
    const webpPath = join(CARDS_DIR, file);
    const before = statSync(webpPath).size;
    totalBefore += before;

    const { tmpPath, quality, size } = await compressToTarget(encoder, sharp, webpPath);
    renameSync(tmpPath, webpPath);

    totalAfter += size;
    const saved = ((1 - size / before) * 100).toFixed(1);
    rows.push({
      name: basename(file, '.webp'),
      before,
      after: size,
      quality,
      saved,
      ok: size <= TARGET_KB * 1024,
    });
  }

  const nameW = Math.max(12, ...rows.map((r) => r.name.length));
  console.log(
    `${'Sign'.padEnd(nameW)}  ${'Before'.padStart(8)}  ${'After'.padStart(8)}  ${'Saved'.padStart(7)}  Q  OK`,
  );
  console.log(`${'-'.repeat(nameW + 40)}`);

  for (const r of rows) {
    const flag = r.ok ? '✓' : '⚠';
    console.log(
      `${r.name.padEnd(nameW)}  ${`${kb(r.before)} KB`.padStart(8)}  ${`${kb(r.after)} KB`.padStart(8)}  ${`−${r.saved}%`.padStart(7)}  ${String(r.quality).padStart(2)}  ${flag}`,
    );
  }

  const totalSaved = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
  console.log(`${'-'.repeat(nameW + 40)}`);
  console.log(
    `${'TOTAL'.padEnd(nameW)}  ${`${kb(totalBefore)} KB`.padStart(8)}  ${`${kb(totalAfter)} KB`.padStart(8)}  ${`−${totalSaved}%`.padStart(7)}`,
  );

  const over = rows.filter((r) => !r.ok);
  if (over.length) {
    console.log(`\n⚠ ${over.length} file(s) still over ${TARGET_KB} KB: ${over.map((r) => r.name).join(', ')}`);
  } else {
    console.log(`\nAll ${rows.length} files are ≤ ${TARGET_KB} KB.`);
  }

  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});