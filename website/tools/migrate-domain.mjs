#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OLD = 'https://astroprecise.app';
const NEW = 'https://astroprecise.app';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'vendor') continue;
      walk(p, out);
    } else if (/\.(html|xml|txt|json|mjs|js|md)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

let count = 0;
for (const file of walk(ROOT)) {
  const rel = file.replace(ROOT + '\\', '').replace(ROOT + '/', '');
  if (rel.startsWith('tools/migrate-domain')) continue;
  const src = readFileSync(file, 'utf8');
  if (!src.includes(OLD)) continue;
  writeFileSync(file, src.split(OLD).join(NEW));
  count++;
  console.log('updated', rel);
}
console.log(`done — ${count} files`);