#!/usr/bin/env node
// sync-brand-tokens.mjs — copy the Paper & Night token layer from
// website/css/ap-tokens.css (the canonical brand-pack file) into the top of
// website/css/ap-next.css, between the AP-TOKENS markers.
//
// Why a copy and not a <link>: a separate render-blocking stylesheet cost the
// light pages 150–900 ms of simulated mobile FCP in Lighthouse. Folding the
// layer into the shell file keeps one request.
//
// What is copied: the @font-face rules, the :root tokens, the component
// classes (.ap-eyebrow, .ap-btn, .ap-card, .ap-specimen, .ap-glyph, .ap-num),
// .ap-sky and the reduced-motion rule; :root becomes .ap-next. What is left out: the legacy alias
// block (ap-next.css defines --ap-next-* itself, with fallbacks) and the bare
// element rules (html, h1–h3, a, :focus-visible), because the dark legacy
// pages also load ap-next.css until they migrate (MIGRATION-PLAN step 5).
//
// node tools/sync-brand-tokens.mjs          write
// node tools/sync-brand-tokens.mjs --check  exit 1 when ap-next.css is stale
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CSS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'website', 'css');
const BEGIN = '/* AP-TOKENS-BEGIN — generated from css/ap-tokens.css by tools/sync-brand-tokens.mjs; edit the source */';
const END = '/* AP-TOKENS-END */';

export function tokenLayer(src) {
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let depth = 0, start = 0;
  for (let i = 0; i < noComments.length; i++) {
    const c = noComments[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { rules.push(noComments.slice(start, i + 1).trim()); start = i + 1; } }
  }
  const keep = rules.filter((r) => {
    const sel = r.slice(0, r.indexOf('{')).trim();
    if (sel === '@font-face' || sel.startsWith('@media')) return true;
    if (sel === ':root') return !/--ap-next-/.test(r);
    return sel.split(',').every((s) => s.trim().startsWith('.'));
  });
  // The tokens live on body.ap-next, not :root: the dark legacy stylesheets
  // define their own --ap-paper / --ap-line / --ap-proof / --ap-radius /
  // --ap-hairline on :root, and ap-next.css loads after them.
  return keep.map((r) => (r.startsWith(':root') ? '.ap-next' + r.slice(5) : r)).map((r) => r.replace(/\s*\n\s*/g, ' ').replace(/\s*([{};:,])\s*/g, '$1').replace(/;}/g, '}')).join('\n');
}

const src = readFileSync(path.join(CSS, 'ap-tokens.css'), 'utf8');
const block = `${BEGIN}\n${tokenLayer(src)}\n${END}\n`;
const nextPath = path.join(CSS, 'ap-next.css');
const next = readFileSync(nextPath, 'utf8');
const re = /\/\* AP-TOKENS-BEGIN[\s\S]*?\/\* AP-TOKENS-END \*\/\n/;
const out = re.test(next) ? next.replace(re, block) : block + next;
if (process.argv.includes('--check')) {
  if (out !== next) { console.error('ap-next.css token layer is stale: run node tools/sync-brand-tokens.mjs'); process.exit(1); }
  console.log('ap-next.css token layer matches css/ap-tokens.css');
} else {
  writeFileSync(nextPath, out);
  console.log('ap-next.css token layer written');
}
