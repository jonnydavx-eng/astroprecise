/**
 * Save current screenshots as visual regression baselines.
 */
import { cp, mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out');
const BASELINE = join(__dirname, 'baseline');

async function copyPngs(src, dest) {
  await mkdir(dest, { recursive: true });
  let n = 0;
  for (const f of await readdir(src)) {
    if (!f.endsWith('.png')) continue;
    await cp(join(src, f), join(dest, f));
    n++;
  }
  return n;
}

async function main() {
  await mkdir(BASELINE, { recursive: true });
  const pre = await copyPngs(OUT, join(BASELINE, 'preloader'));
  let pages = 0;
  try {
    pages = await copyPngs(join(OUT, 'pages'), join(BASELINE, 'pages'));
  } catch (_) { /* pages not captured yet */ }
  console.log(`Saved baseline: ${pre} preloader + ${pages} page PNGs → ${BASELINE}`);
}

main();