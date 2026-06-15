#!/usr/bin/env node
/**
 * Replaces duplicate footer <nav> landmarks with <div role="group"> for Tools/Account columns.
 * Run: node website/tools/fix-footer-nav-landmarks.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');

function fixFooterNav(html) {
  let next = html;

  next = next.replace(
    /<nav class="footer-nav-col" aria-label="(Footer tools|Tools) navigation">([\s\S]*?)<\/nav>/g,
    '<div class="footer-nav-col" role="group" aria-label="$1 navigation">$2</div>'
  );

  next = next.replace(
    /<nav class="footer-nav-col" aria-label="(Footer account|Account) navigation">([\s\S]*?)<\/nav>/g,
    '<div class="footer-nav-col" role="group" aria-label="$1 navigation">$2</div>'
  );

  next = next.replace(
    /<nav aria-label="Tools navigation">([\s\S]*?)<\/nav>/g,
    '<div role="group" aria-label="Tools navigation">$1</div>'
  );

  next = next.replace(
    /<nav aria-label="Account navigation">([\s\S]*?)<\/nav>/g,
    '<div role="group" aria-label="Account navigation">$1</div>'
  );

  return next;
}

let changed = 0;

for (const file of readdirSync(WEB).filter((f) => f.endsWith('.html'))) {
  const path = join(WEB, file);
  const src = readFileSync(path, 'utf8');
  const next = fixFooterNav(src);
  if (next !== src) {
    writeFileSync(path, next, 'utf8');
    changed++;
    console.log('fixed footer nav:', file);
  }
}

console.log(`Done — ${changed} file(s) updated.`);