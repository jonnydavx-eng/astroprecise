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

/* ── AP structure utilities (mirrors main.css tail — keep in sync) ── */
:root {
  --bp-tablet: 768px;
  --bp-desktop: 1024px;
}
.ap-line-clamp-2,
.ap-line-clamp-3 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: calc(var(--ap-lc-lines, 2) * 1em * var(--ap-lc-lh, 1.55));
}
.ap-line-clamp-2 { -webkit-line-clamp: 2; --ap-lc-lines: 2; }
.ap-line-clamp-3 { -webkit-line-clamp: 3; --ap-lc-lines: 3; }
.ap-grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--grid-min, 260px), 1fr));
  gap: var(--space-5, 1.5rem);
}
.app-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 560px;
  margin-inline: auto;
  padding: var(--section-pad-y-tight, 3rem) var(--space-6, 2rem);
  background: var(--surface, rgba(20, 16, 10, 0.56));
  border: 1px solid var(--border, var(--ap-gold-a16));
  border-radius: var(--radius-lg, 16px);
}
.app-empty-state__seal {
  display: block;
  font-size: 2.6rem;
  line-height: 1;
  color: var(--gold, var(--ap-gold-core));
  margin-bottom: var(--space-4, 1rem);
}
.app-empty-state__title {
  font-family: var(--font-display, 'Cinzel', serif);
  font-size: var(--display-3, 1.35rem);
  font-weight: var(--weight-bold, 700);
  letter-spacing: var(--tracking-tight, 0.01em);
  color: var(--gold-pale, var(--ap-gold-parchment));
  margin: 0 0 var(--space-3, 0.7rem);
}
.app-empty-state__sub {
  font-size: 0.92rem;
  line-height: 1.7;
  color: var(--silver, #A89E88);
  max-width: 42ch;
  margin: 0 auto var(--space-5, 1.75rem);
}
.app-empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3, 0.75rem);
  justify-content: center;
}
@media (max-width: 600px) {
  .app-empty-state { padding: var(--space-8, 2.25rem) var(--space-5, 1.5rem); }
  .app-empty-state__actions { width: 100%; }
  .app-empty-state__actions .btn { flex: 1 1 auto; }
}

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