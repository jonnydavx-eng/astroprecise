#!/usr/bin/env node
/**
 * Batch-migrate Tier-C editorial pages to unified ap-page-boot.js chrome.
 * Instrument pages (chart, horoscope, compatibility) get ap-zodiac-constants before app.js.
 *
 * Editorial: requires main-lite + deferMainCss (adds if missing); replaces
 * ap-page-bridge / ap-nav-model / app.js (and duplicate zodiac/seal chrome) with
 * ap-page-boot.js defer. Keeps page-specific scripts (icons.js stays when present
 * so sync page JS can run before the defer chain).
 *
 * Run: node tools/migrate-page-boot.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Editorial / tool pages on main-lite (not sign or instrument shells). */
const EDITORIAL_TIER_C = [
  'accuracy.html',
  'angel-numbers.html',
  'lifepath.html',
  'moonphase.html',
  'tonight.html',
  'retrograde.html',
  'name-numerology.html',
  'charts.html',
  'synastry.html',
  'solar-return.html',
  'saturn-return.html',
  'what-is-my-rising-sign.html',
  'quiz.html',
  'why.html',
  'outreach.html',
  'links.html',
  'profile.html',
  'transits.html',
];

const INSTRUMENT_PAGES = ['chart.html', 'horoscope.html', 'compatibility.html'];

const DEFER_MAIN_CSS =
  `<script defer>document.addEventListener('DOMContentLoaded',function(){deferMainCss();});</script>`;

/** Chrome scripts replaced by ap-page-boot (icons.js kept when already on page). */
const CHROME_REMOVE = [
  'js/ap-zodiac-constants.js',
  'js/celestial-seals.js',
  'js/ap-page-bridge.js',
  'js/ap-nav-model.js',
  'js/app.js',
];

const AP_PAGE_BOOT = '  <script src="js/ap-page-boot.js" defer></script>\n';

function removeScriptTag(html, src) {
  const re = new RegExp(
    `\\s*<script[^>]*src="${src.replace(/\./g, '\\.')}"[^>]*>\\s*</script>\\s*`,
    'gi',
  );
  return html.replace(re, '\n');
}

function hasScript(html, src) {
  return new RegExp(`src="${src.replace(/\./g, '\\.')}"`).test(html);
}

function scriptIndex(html, src) {
  const re = new RegExp(`<script[^>]*src="${src.replace(/\./g, '\\.')}"[^>]*>`, 'i');
  const m = html.match(re);
  return m ? html.indexOf(m[0]) : -1;
}

function ensureDeferMainCss(html) {
  if (html.includes('deferMainCss')) return html;
  if (!html.includes('defer-page-css.js')) {
    console.warn('  skip deferMainCss — no defer-page-css.js');
    return html;
  }
  return html.replace(
    /(<script src="js\/defer-page-css\.js" defer><\/script>)/,
    `$1\n  ${DEFER_MAIN_CSS.trim()}`,
  );
}

function ensureApPageBoot(html) {
  if (html.includes('ap-page-boot.js')) return html;
  const bodyClose = html.lastIndexOf('</body>');
  if (bodyClose < 0) return html;
  return html.slice(0, bodyClose) + AP_PAGE_BOOT + html.slice(bodyClose);
}

function stripChromeScripts(html) {
  let out = html;
  for (const src of CHROME_REMOVE) {
    out = removeScriptTag(out, src);
  }
  return out;
}

function migrateEditorial(file) {
  const path = join(WEB, file);
  if (!existsSync(path)) {
    console.warn('missing:', file);
    return false;
  }

  let html = readFileSync(path, 'utf8');
  if (!html.includes('main-lite.css')) {
    console.warn('skip (no main-lite):', file);
    return false;
  }
  if (html.includes('ap-sign-defer-boot.js')) {
    console.warn('skip (sign defer boot):', file);
    return false;
  }

  const before = html;
  html = ensureDeferMainCss(html);
  if (!html.includes('ap-page-boot.js')) {
    html = stripChromeScripts(html);
    html = ensureApPageBoot(html);
  }

  if (html === before) {
    console.log('unchanged:', file);
    return false;
  }

  writeFileSync(path, html, 'utf8');
  console.log('migrated:', file);
  return true;
}

function ensureZodiacBeforeApp(html, file) {
  const appIdx = scriptIndex(html, 'js/app.js');
  if (appIdx < 0) {
    console.warn('skip zodiac order (no app.js):', file);
    return false;
  }

  const zodiacTag = '<script src="js/ap-zodiac-constants.js" defer></script>\n';
  let out = html;
  let changed = false;

  if (!hasScript(out, 'js/ap-zodiac-constants.js')) {
    out = out.slice(0, appIdx) + zodiacTag + out.slice(appIdx);
    changed = true;
  } else {
    const zodiacIdx = scriptIndex(out, 'js/ap-zodiac-constants.js');
    if (zodiacIdx > appIdx) {
      out = removeScriptTag(out, 'js/ap-zodiac-constants.js');
      const newAppIdx = scriptIndex(out, 'js/app.js');
      out = out.slice(0, newAppIdx) + zodiacTag + out.slice(newAppIdx);
      changed = true;
    }
  }

  if (!changed) {
    console.log('zodiac order ok:', file);
    return false;
  }

  writeFileSync(join(WEB, file), out, 'utf8');
  console.log('fixed zodiac order:', file);
  return true;
}

function main() {
  let n = 0;

  for (const file of EDITORIAL_TIER_C) {
    if (migrateEditorial(file)) n++;
  }

  for (const file of INSTRUMENT_PAGES) {
    const path = join(WEB, file);
    if (!existsSync(path)) continue;
    const html = readFileSync(path, 'utf8');
    if (ensureZodiacBeforeApp(html, file)) n++;
  }

  console.log(`Done — ${n} file(s) updated.`);
}

main();