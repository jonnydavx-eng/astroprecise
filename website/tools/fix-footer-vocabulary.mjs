#!/usr/bin/env node
/**
 * Align footer link labels with NAV vocabulary; upgrade legacy footers to footer-model.
 * Run: node tools/fix-footer-vocabulary.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { footerBlockHtml } from './footer-model.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Lite home footer — intentional minimal nav; do not replace. */
const SKIP_FULL_REPLACE = new Set(['index.html', 'index-lite.html']);

function hasFooterModel(html) {
  return html.includes('data-ap-footer-model');
}

function hasLegacyFooter(html) {
  if (hasFooterModel(html)) return false;
  if (html.includes('footer__links') || html.includes('footer__grid')) return true;
  if (/class="footer-nav"/.test(html)) return true;
  if (/<div class="footer-inner"(?![^>]*\bdata-ap-footer-model)/.test(html)) return true;
  // Minimal footer (e.g. ephemeris) — container with legal only, no nav grid
  if (
    /<footer[\s\S]*?<\/footer>/i.test(html) &&
    !html.includes('footer-nav-col') &&
    !html.includes('ap-lite-footer')
  ) {
    return true;
  }
  return false;
}

function footerClassFromOpenTag(openTag) {
  if (/class="[^"]*\bap-lite-footer\b/.test(openTag)) return null;
  if (/class="[^"]*\bsite-footer\b/.test(openTag)) return 'site-footer';
  return 'footer';
}

/** Horoscope→Daily, Compatibility→Match, Instrument→Sky — footer only, href-scoped. */
function fixFooterVocabulary(footerHtml) {
  let f = footerHtml;
  f = f.replace(
    /(<a\b[^>]*\bhref=["']horoscope\.html[^"']*["'][^>]*>)\s*Horoscope\s*(<\/a>)/gi,
    '$1Daily$2',
  );
  f = f.replace(
    /(<a\b[^>]*\bhref=["']compatibility\.html[^"']*["'][^>]*>)\s*Compatibility\s*(<\/a>)/gi,
    '$1Match$2',
  );
  f = f.replace(
    /(<a\b[^>]*\bhref=["']ephemeris\.html[^"']*["'][^>]*>)\s*(?:The\s+)?Instrument\s*(<\/a>)/gi,
    '$1Sky$2',
  );
  return f;
}

function upgradeFooterBlock(html) {
  return html.replace(/<footer\s+([^>]*)>[\s\S]*?<\/footer>/i, (match, attrs) => {
    const fc = footerClassFromOpenTag(`<footer ${attrs}>`);
    if (!fc) return match;
    return footerBlockHtml({ footerClass: fc }).trim();
  });
}

function processHtml(html, filename) {
  let next = html;

  if (!SKIP_FULL_REPLACE.has(filename) && hasLegacyFooter(html)) {
    next = upgradeFooterBlock(next);
  } else {
    next = next.replace(/<footer[\s\S]*?<\/footer>/gi, fixFooterVocabulary);
  }

  return next;
}

let changed = 0;

for (const name of readdirSync(root)) {
  if (!name.endsWith('.html')) continue;
  const path = join(root, name);
  const before = readFileSync(path, 'utf8');
  const after = processHtml(before, name);
  if (after !== before) {
    writeFileSync(path, after, 'utf8');
    changed++;
    console.log('updated:', name);
  }
}

console.log(`fix-footer-vocabulary: ${changed} file(s) updated`);