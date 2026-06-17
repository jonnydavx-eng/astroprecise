#!/usr/bin/env node
/**
 * Batch-migrate legacy pages (blocking main.css) to main-lite + deferred full CSS.
 * Sign pages share css/sign-page.css; other pages get css/<basename>-page.css.
 *
 * Run: node website/tools/migrate-legacy-to-main-lite.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS_DIR = join(WEB, 'css');

const SIGN_PAGES = new Set([
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
]);

const SKIP = new Set(['404.html', 'fulfil-redirect.html', 'phone-audit.html', 'phone-cosmic-viewer.html', 'sample-reading.html', 'terms.html', 'privacy.html', 'index.html', 'index-full.html', 'index-lite.html']);

function mainLiteHead(pageCss) {
  return `<link rel="preload" href="css/main-lite.css" as="style" />
  <link rel="stylesheet" href="css/fonts.css" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="css/fonts.css" /></noscript>
  <link rel="stylesheet" href="css/main-lite.css" />
  <link rel="stylesheet" href="css/ap-page-bridge.css" />
  <link rel="stylesheet" href="css/${pageCss}" />
  <script src="js/defer-page-css.js" defer></script>
  <script defer>document.addEventListener('DOMContentLoaded',function(){deferMainCss();});</script>`;
}

function extractStyles(html) {
  return [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1].trim());
}

function ensureBridgeScript(html) {
  if (html.includes('ap-page-bridge.js')) return html;
  if (html.includes('js/app.js')) {
    return html.replace(
      /<script src="js\/app\.js"/,
      '<script src="js/ap-page-bridge.js" defer></script>\n  <script src="js/app.js"',
    );
  }
  const bodyClose = html.lastIndexOf('</body>');
  if (bodyClose < 0) return html;
  return html.slice(0, bodyClose) + '  <script src="js/ap-page-bridge.js" defer></script>\n' + html.slice(bodyClose);
}

// Build shared sign-page.css once from aries
const ariesPath = join(WEB, 'aries.html');
if (existsSync(ariesPath)) {
  const ariesHtml = readFileSync(ariesPath, 'utf8');
  const signBlocks = extractStyles(ariesHtml);
  if (signBlocks.length) {
    const signCss = `/* Zodiac sign pages — shared extracted styles */\n${signBlocks.join('\n\n')}\n`;
    writeFileSync(join(CSS_DIR, 'sign-page.css'), signCss, 'utf8');
    console.log('sign-page.css', (Buffer.byteLength(signCss) / 1024).toFixed(1), 'KB');
  }
}

const files = readdirSync(WEB).filter(f => f.endsWith('.html') && !SKIP.has(f));
let migrated = 0;

for (const file of files) {
  const path = join(WEB, file);
  let html = readFileSync(path, 'utf8');

  if (!/<link rel="stylesheet" href="css\/main\.css"/.test(html)) continue;
  if (html.includes('css/main-lite.css')) {
    console.warn('skip (already has main-lite):', file);
    continue;
  }

  const base = basename(file, '.html');
  const isSign = SIGN_PAGES.has(base);
  const pageCss = isSign ? 'sign-page.css' : `${base}-page.css`;

  if (!isSign) {
    const blocks = extractStyles(html);
    if (blocks.length) {
      const css = `/* ${file} — extracted inline styles */\n${blocks.join('\n\n')}\n`;
      writeFileSync(join(CSS_DIR, pageCss), css, 'utf8');
      console.log(pageCss, (Buffer.byteLength(css) / 1024).toFixed(1), 'KB');
    } else {
      console.warn('no inline styles for', file, '— main-lite only');
    }
  }

  html = html.replace(/<link rel="stylesheet" href="css\/fonts\.css" \/>\s*/g, '');
  html = html.replace(/<link rel="stylesheet" href="css\/main\.css" \/>\s*/g, '');
  html = html.replace(/<style>[\s\S]*?<\/style>\s*/g, '');

  const anchor = html.indexOf('<meta name="theme-color"');
  const insertAt = anchor >= 0 ? html.indexOf('>', anchor) + 1 : html.indexOf('</head>');
  if (insertAt < 0) {
    console.error('no insert point:', file);
    continue;
  }

  html = html.slice(0, insertAt) + '\n  ' + mainLiteHead(pageCss) + html.slice(insertAt);
  html = ensureBridgeScript(html);

  writeFileSync(path, html, 'utf8');
  migrated++;
  console.log('migrated:', file);
}

console.log(`Done — ${migrated} page(s) migrated to main-lite.`);