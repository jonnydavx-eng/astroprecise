/**
 * Regenerate Cinzel 700 subset for chart hero h1 LCP.
 * Requires pyftsubset (fonttools): pip install fonttools brotli
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'fonts', 'cinzel-normal-700.woff2');
const OUT = path.join(ROOT, 'fonts', 'cinzel-hero-700.woff2');
const TEXT = 'Your Natal Blueprint';

const pyft = process.env.PYFTSUBSET || 'pyftsubset';
const r = spawnSync(pyft, [
  SRC,
  `--text=${TEXT}`,
  '--flavor=woff2',
  `--output-file=${OUT}`,
], { stdio: 'inherit' });

if (r.status !== 0) process.exit(r.status || 1);
console.log(`Wrote ${OUT} (${TEXT})`);