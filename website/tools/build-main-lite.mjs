#!/usr/bin/env node
/**
 * Extract above-fold shell from main.css → main-lite.css
 * Regenerate after main.css nav/token changes: node tools/build-main-lite.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const src = readFileSync(join(root, 'css', 'main.css'), 'utf8');
const lines = src.split(/\r?\n/);

/** 1-based inclusive line ranges from main.css */
const RANGES = [
  [1, 948],      // tokens, reset, starfield, aurora, layout, navbar, buttons
  [981, 991],    // hero__eyebrow (compat/inner heroes)
  [1687, 1803],  // forms (chart/compat hero inputs)
  [4970, 5014],  // nav updates cluster
  [5075, 5157],  // nav responsive + mobile hamburger (hide desktop links <1024px)
  [5306, 5323],  // decorative .orb (compat hero)
  [6171, 6297],  // compat-orbs hero strip + person labels
  [6489, 6517],  // ap-badge (engraved instrument badge)
  [6519, 6570],  // overflow clip + full privacy banner + close btn
  [6659, 6814],  // navbar__profile-top + bottom-nav + mobile padding (skip manifesto fragment)
  [7328, 7333],  // .eng-i inline icons (hero, buttons, bottom-nav)
  [3016, 3037],  // skip-link (app.js inject — contrast before deferMainCss)
  [7443, 7488],  // ap-legal-links / ap-guide-links footer injects (incl. footer-legal close)
];

const chunks = RANGES.map(([start, end]) =>
  lines.slice(start - 1, end).join('\n')
);

let out = [
  '/* AUTO-GENERATED — node tools/build-main-lite.mjs — do not edit by hand */',
  '/* Slim blocking shell for inner pages; full main.css idle-loads via deferMainCss() */',
  '',
  ...chunks,
].join('\n');

// Perf: static first paint — animations load with full main.css
out = out.replace(
  /animation:\s*nebula-drift\s+42s[^;]+;/g,
  'animation: none;'
);
out = out.replace(
  /\.aurora-orb\s*\{[^}]*animation:\s*aurora-float[^}]*\}/s,
  `.aurora-orb {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(80px);
  z-index: 0;
  mix-blend-mode: screen;
  animation: none;
}`
);
// Film grain is expensive on mobile first paint — full main.css restores it
out = out.replace(/body::after\s*\{[\s\S]*?\n\}/m, 'body::after { content: none; }');
// Static compat orbs in lite (animations in full main.css)
out = out.replace(/animation:\s*orb-breathe-\d[^;]+;/g, 'animation: none;');

// Footer social icons — 44px touch targets (main.css uses 38px; index has ap-lite-chrome)
out += `

/* ── Footer social row (a11y touch targets on main-lite pages) ── */
.ap-social-row { text-align: center; padding: var(--space-4, 1rem) 0; }
.ap-social-row__icons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2, 0.5rem);
  justify-content: center;
  align-items: center;
}
.ap-social-icon {
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md, 10px);
  background: var(--surface, rgba(14, 11, 8, 0.72));
  border: 1px solid var(--border, rgba(168, 158, 136, 0.18));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--silver-dim, #9A9084);
  text-decoration: none;
  cursor: pointer;
  padding: 0;
  box-sizing: border-box;
}
.ap-social-icon__svg { width: 18px; height: 18px; }
.ap-social-icon--soon { opacity: 0.42; cursor: default; }

/* ── View transitions (active before deferMainCss loads full main.css) ── */
@view-transition { navigation: auto; }
::view-transition-old(root) { animation: ap-vt-out 0.35s ease both; }
::view-transition-new(root) { animation: ap-vt-in 0.35s ease both; }
@keyframes ap-vt-out { to { opacity: 0; } }
@keyframes ap-vt-in { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
}
`;

// Reject manifesto-bleed fragment from a bad [6654,*] extract (properties after lone `}`)
if (/\}\s*\n\s{2}border-radius: 50%;\s*\n\s{2}background: currentColor;\s*\n\s{2}opacity: 0\.7;\s*\n\}/.test(out)) {
  console.error('main-lite.css validation failed — manifesto ::before fragment leaked into output');
  process.exit(1);
}
if (!out.includes('.eng-i { opacity: 0.92; }')) {
  console.error('main-lite.css validation failed — missing .eng-i rules (check [7328,7333] range)');
  process.exit(1);
}
if (!out.includes('.orb--gold {')) {
  console.error('main-lite.css validation failed — missing .orb rules (check [5306,5323] range)');
  process.exit(1);
}

writeFileSync(join(root, 'css', 'main-lite.css'), out, 'utf8');
const kb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1);
console.log(`main-lite.css written (${kb} KB, ${out.split('\n').length} lines)`);