import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src  = join(here, '..', 'website', 'js', 'ephemeris.js');
const dest = join(here, 'ephemeris.cjs');

const HEADER =
  '// Auto-synced from website/js/ephemeris.js — do not edit; run npm run sync\n';

writeFileSync(dest, HEADER + readFileSync(src, 'utf8'));
console.log(`synced ${src} -> ${dest}`);
