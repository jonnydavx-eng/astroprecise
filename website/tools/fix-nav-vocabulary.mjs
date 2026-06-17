#!/usr/bin/env node
/**
 * Align legacy HTML noscript nav + ap-nav-model.js script tag with NAV_PRIMARY.
 * Run: node tools/fix-nav-vocabulary.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Matches js/ap-nav-model.js NAV_PRIMARY noscript fallback */
const NOSCRIPT_NAV =
  '<noscript><a href="index.html" class="navbar__link">Home</a>'
  + '<a href="chart.html" class="navbar__link">Chart</a>'
  + '<a href="horoscope.html" class="navbar__link">Daily</a>'
  + '<a href="compatibility.html" class="navbar__link">Match</a>'
  + '<a href="ephemeris.html" class="navbar__link">Sky</a></noscript>';

const LEGACY_NOSCRIPT_RE =
  /<noscript><a href="index\.html" class="navbar__link">Home<\/a><a href="chart\.html" class="navbar__link">Chart<\/a><a href="horoscope\.html" class="navbar__link">(?:Horoscope|Daily)<\/a>(?:<a href="compatibility\.html" class="navbar__link">Match<\/a><a href="ephemeris\.html" class="navbar__link">Sky<\/a>)?<\/noscript>/g;

const AP_NAV_SCRIPT = '<script src="js/ap-nav-model.js"></script>';

let changed = 0;

for (const name of readdirSync(root)) {
  if (!name.endsWith('.html')) continue;
  const path = join(root, name);
  let html = readFileSync(path, 'utf8');
  const before = html;

  if (LEGACY_NOSCRIPT_RE.test(html)) {
    html = html.replace(LEGACY_NOSCRIPT_RE, NOSCRIPT_NAV);
  }

  if (html.includes('js/app.js') && !html.includes('js/ap-nav-model.js')) {
    html = html.replace(
      /<script src="js\/app\.js"(\s+defer)?><\/script>/g,
      (m, defer) => `${AP_NAV_SCRIPT}\n  <script src="js/app.js"${defer || ''}></script>`,
    );
  }

  if (html !== before) {
    writeFileSync(path, html, 'utf8');
    changed++;
    console.log('updated:', name);
  }
}

console.log(`fix-nav-vocabulary: ${changed} file(s) updated`);