#!/usr/bin/env node
/**
 * Extract inline <style> blocks from an HTML page into css/<name>-page.css
 * and wire main-lite + deferMainCss pattern.
 *
 * Usage: node tools/extract-page-css.mjs lifepath.html lifepath-page.css
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlName = process.argv[2];
const cssName = process.argv[3];
if (!htmlName || !cssName) {
  console.error('Usage: node extract-page-css.mjs <page.html> <output.css>');
  process.exit(1);
}

const htmlPath = join(root, htmlName);
let html = readFileSync(htmlPath, 'utf8');
const blocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1].trim());
if (!blocks.length) throw new Error(`No <style> in ${htmlName}`);

const css = `/* ${htmlName} — extracted inline styles */\n${blocks.join('\n\n')}\n`;
writeFileSync(join(root, 'css', cssName), css, 'utf8');

const headReplace = `<link rel="preload" href="css/main-lite.css" as="style" />
  <link rel="stylesheet" href="css/fonts.css" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="css/fonts.css" /></noscript>
  <link rel="stylesheet" href="css/main-lite.css" />
  <link rel="stylesheet" href="css/${cssName}" />
  <script src="js/defer-page-css.js" defer></script>
  <script defer>document.addEventListener('DOMContentLoaded',function(){deferMainCss();});</script>`;

html = html.replace(/<link rel="stylesheet" href="css\/fonts.css" \/>\s*/g, '');
html = html.replace(/<link rel="stylesheet" href="css\/main.css" \/>\s*/g, '');
html = html.replace(/<link rel="stylesheet" href="css\/chart.css" \/>\s*/g, '');
html = html.replace(/<style>[\s\S]*?<\/style>\s*/g, '');
const styleAnchor = html.indexOf('<meta name="theme-color"');
if (styleAnchor < 0) throw new Error('theme-color anchor not found');
const insertAt = html.indexOf('>', styleAnchor) + 1;
html = html.slice(0, insertAt) + '\n  ' + headReplace + html.slice(insertAt);

writeFileSync(htmlPath, html, 'utf8');
console.log(`${cssName} ${(Buffer.byteLength(css) / 1024).toFixed(1)} KB`);
console.log(`${htmlName} ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);