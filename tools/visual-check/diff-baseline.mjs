/**
 * Pixel-diff current captures against baseline/ — catches visual regressions.
 */
import { readFile, readdir, mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out');
const BASELINE = join(__dirname, 'baseline');
const DIFF = join(__dirname, 'out', 'diff');

async function loadPng(path) {
  return PNG.sync.read(await readFile(path));
}

async function diffPair(name, currentPath, baselinePath, diffDir) {
  const entry = { name, current: currentPath, baseline: baselinePath };
  try {
    const img1 = await loadPng(baselinePath);
    const img2 = await loadPng(currentPath);
    if (img1.width !== img2.width || img1.height !== img2.height) {
      entry.ok = false;
      entry.reason = `size mismatch ${img1.width}x${img1.height} vs ${img2.width}x${img2.height}`;
      return entry;
    }
    const diff = new PNG({ width: img1.width, height: img1.height });
    const numDiff = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {
      threshold: 0.12,
      includeAA: true,
    });
    const ratio = numDiff / (img1.width * img1.height);
    entry.diffPixels = numDiff;
    entry.diffRatio = Number(ratio.toFixed(5));
    entry.ok = ratio < 0.02;
    if (!entry.ok) {
      const outPath = join(diffDir, `${name}-diff.png`);
      await writeFile(outPath, PNG.sync.write(diff));
      entry.diffImage = outPath;
    }
  } catch (err) {
    entry.ok = false;
    entry.reason = String(err);
  }
  return entry;
}

async function diffFolder(sub, label, curDir) {
  const baseDir = join(BASELINE, sub);
  const diffDir = join(DIFF, sub);
  await mkdir(diffDir, { recursive: true });
  const results = [];
  let files;
  try {
    files = (await readdir(baseDir)).filter((f) => f.endsWith('.png'));
  } catch {
    return { label, missingBaseline: true, results: [] };
  }
  for (const f of files) {
    results.push(await diffPair(f.replace('.png', ''), join(curDir, f), join(baseDir, f), diffDir));
  }
  return { label, results };
}

async function main() {
  await mkdir(DIFF, { recursive: true });
  const pre = await diffFolder('preloader', 'preloader', OUT);
  const pages = await diffFolder('pages', 'pages', join(OUT, 'pages'));
  const issues = [];
  for (const group of [pre, pages]) {
    if (group.missingBaseline) {
      issues.push(`${group.label}: no baseline — run npm run baseline:save after a good capture`);
      continue;
    }
    for (const r of group.results) {
      if (!r.ok) issues.push(`${group.label}/${r.name}: ${r.reason || `diff ${(r.diffRatio * 100).toFixed(2)}%`}`);
    }
  }
  const report = { ok: issues.length === 0, issues, preloader: pre, pages };
  await writeFile(join(DIFF, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, issues }, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}

main();