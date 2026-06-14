#!/usr/bin/env node
/**
 * Replaces per-page hardcoded <header class="site-header"> nav blocks with the
 * canonical empty shell (JS injects links via renderNav in app.js).
 *
 * Run from repo root:  node website/tools/normalize-nav-shells.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');

const NAV_HEADER = `<header class="site-header" role="banner">
    <nav class="navbar" aria-label="Main navigation">
      <div class="navbar__inner">
        <a href="index.html" class="navbar__logo" aria-label="AstroPrecise home">
          <div class="navbar__logo-icon" aria-hidden="true"><img src="img/logo.svg" alt="" width="32" height="32" /></div>
          <span class="logo-text">AstroPrecise</span>
        </a>
        <div class="navbar__nav" aria-label="Primary">
          <noscript><a href="index.html" class="navbar__link">Home</a><a href="chart.html" class="navbar__link">Chart</a><a href="horoscope.html" class="navbar__link">Horoscope</a></noscript>
        </div>
        <div class="navbar__end">
          <button class="navbar__toggle" id="nav-toggle" aria-controls="nav-mobile-menu" aria-expanded="false" aria-label="Toggle navigation menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
      <div class="navbar__mobile-menu" id="nav-mobile-menu" role="dialog" aria-label="Mobile navigation" aria-hidden="true"></div>
    </nav>
  </header>`;

const HEADER_RE = /<header class="site-header"[^>]*>[\s\S]*?<\/header>/;

const files = readdirSync(WEB).filter(f => f.endsWith('.html'));
let changed = 0;

for (const file of files) {
  const path = join(WEB, file);
  const src = readFileSync(path, 'utf8');
  if (!src.includes('class="navbar"')) continue;
  if (!HEADER_RE.test(src)) {
    console.warn('skip (no site-header match):', file);
    continue;
  }
  const next = src.replace(HEADER_RE, NAV_HEADER);
  if (next !== src) {
    writeFileSync(path, next, 'utf8');
    changed++;
    console.log('normalized:', file);
  }
}

console.log(`Done — ${changed} file(s) updated.`);