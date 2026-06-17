#!/usr/bin/env node
/**
 * Align ephemeris nav-adjacent labels with NAV_PRIMARY "Sky".
 * Keeps "The Instrument" on ephemeris.html hero (feature branding).
 * Run: node tools/fix-sky-vocabulary.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const HTML_REPLACEMENTS = [
  [/class="live-sky-action">The Instrument<\/a>/g, 'class="live-sky-action">Sky</a>'],
  [/class="live-sky-action">Sky\/a>/g, 'class="live-sky-action">Sky</a>'],
  [
    /(href="ephemeris\.html"[^>]*class="[^"]*tool-card[^"]*"[^>]*aria-label=")The Instrument/g,
    '$1Sky',
  ],
  [
    /<h3 class="tool-card__title">The Instrument<\/h3>/g,
    '<h3 class="tool-card__title">Sky</h3>',
  ],
  [
    /<span class="tool-card__arrow"[^>]*>Open The Instrument/g,
    '<span class="tool-card__arrow" aria-hidden="true">Open Sky',
  ],
  [
    /(uranus|neptune):\s*\{\s*href:\s*'ephemeris\.html',\s*label:\s*'The Instrument'/g,
    "$1: { href: 'ephemeris.html', label: 'Sky'",
  ],
  [
    /<h3 class="ap-tool-card__title">The Instrument<\/h3>/g,
    '<h3 class="ap-tool-card__title">Sky</h3>',
  ],
  [
    /<span class="lib-link__label">&#9728; The Instrument<\/span>/g,
    '<span class="lib-link__label">&#9728; Sky</span>',
  ],
  [
    /Explore The Instrument — a deeper reading of your sky/g,
    'Explore Sky — The Instrument, a deeper reading of your birth sky',
  ],
];

const JS_REPLACEMENTS = [
  [/cta:\s*'Open The Instrument'/g, "cta: 'Open Sky'"],
  [/headline:\s*'The Instrument awaits'/g, "headline: 'Sky awaits'"],
  [
    /title:\s*'The Instrument',\s*\n\s*desc:\s*'/g,
    "title: 'Sky',\n      desc: 'The Instrument — ",
  ],
  [
    /title:'Enter The Instrument'/g,
    "title:'Explore Sky'",
  ],
  [
    /cta:'Open The Instrument'/g,
    "cta:'Open Sky'",
  ],
];

let changed = 0;

for (const name of readdirSync(root)) {
  if (!name.endsWith('.html') || name === 'ephemeris.html') continue;
  const path = join(root, name);
  let html = readFileSync(path, 'utf8');
  const before = html;
  for (const [re, rep] of HTML_REPLACEMENTS) {
    html = html.replace(re, rep);
  }
  if (html !== before) {
    writeFileSync(path, html, 'utf8');
    changed++;
    console.log('updated:', name);
  }
}

const jsDir = join(root, 'js');
for (const name of readdirSync(jsDir)) {
  if (!name.endsWith('.js')) continue;
  const path = join(jsDir, name);
  if (!statSync(path).isFile()) continue;
  let src = readFileSync(path, 'utf8');
  const before = src;
  for (const [re, rep] of JS_REPLACEMENTS) {
    src = src.replace(re, rep);
  }
  if (src !== before) {
    writeFileSync(path, src, 'utf8');
    changed++;
    console.log('updated: js/' + name);
  }
}

console.log(`fix-sky-vocabulary: ${changed} file(s) updated`);