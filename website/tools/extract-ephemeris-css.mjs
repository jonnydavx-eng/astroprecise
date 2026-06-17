#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'ephemeris.html');
const html = readFileSync(htmlPath, 'utf8');
const m = html.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error('No <style> block in ephemeris.html');

const css = `/* Ephemeris / Instrument page — extracted from ephemeris.html */\n${m[1].trim()}\n`;
writeFileSync(join(root, 'css', 'ephemeris-page.css'), css, 'utf8');

const headReplace = `<link rel="preload" href="css/main-lite.css" as="style" />
  <link rel="stylesheet" href="css/fonts.css" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="css/fonts.css" /></noscript>
  <link rel="stylesheet" href="css/main-lite.css" />
  <link rel="stylesheet" href="css/ephemeris-page.css" />
  <script src="js/defer-page-css.js" defer></script>
  <script defer>document.addEventListener('DOMContentLoaded',function(){deferMainCss();});</script>`;

const out = html
  .replace(/<link rel="stylesheet" href="css\/fonts.css" \/>\s*/g, '')
  .replace(
    /<link rel="stylesheet" href="css\/main.css" \/>\s*<style>[\s\S]*?<\/style>/,
    headReplace
  );

writeFileSync(htmlPath, out, 'utf8');
console.log(`ephemeris-page.css ${(Buffer.byteLength(css) / 1024).toFixed(1)} KB`);
console.log(`ephemeris.html ${(Buffer.byteLength(out) / 1024).toFixed(1)} KB`);