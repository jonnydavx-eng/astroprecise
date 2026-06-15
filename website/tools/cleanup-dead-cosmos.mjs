#!/usr/bin/env node
/**
 * Removes dead .cosmos-solar-system HTML blocks from website/*.html pages.
 * Run from repo root: node website/tools/cleanup-dead-cosmos.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Match block through outer closing div (next sibling is aurora-orb). */
const COSMOS_BLOCK_RE =
  /[ \t]*<div class="cosmos-solar-system"[^>]*>[\s\S]*?<\/div>\s*\n(?=[ \t]*<div class="aurora-orb)/g;

const INDEX_HIDE_RE =
  /[ \t]*\/\* Hide competing decorative corner solar system[\s\S]*?body > \.cosmos-solar-system \{ display: none !important; \}\s*\n/;

let changed = 0;

for (const file of readdirSync(WEB).filter((f) => f.endsWith('.html'))) {
  const path = join(WEB, file);
  let src = readFileSync(path, 'utf8');
  let next = src.replace(COSMOS_BLOCK_RE, '');

  if (file === 'index.html') {
    next = next.replace(INDEX_HIDE_RE, '');
  }

  if (next !== src) {
    writeFileSync(path, next, 'utf8');
    changed++;
    console.log('cleaned:', file);
  }
}

console.log(`Done — ${changed} file(s) updated.`);