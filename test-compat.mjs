/**
 * Synastry regression — longitude-based aspects must emit p1/p2.
 * Run: node test-compat.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));
const win = {};
for (const file of ['website/js/ephemeris.js', 'website/js/interpretations.js']) {
  new Function('window', 'console', readFileSync(join(root, file), 'utf8'))(win, console);
}

const E = win.AstroEphemeris;
const I = win.AstroInterpretations;
let pass = 0;
let fail = 0;
const ok = (name, cond, got) => {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${name}${got !== undefined ? ' — got ' + got : ''}`); }
};

function chart(y, m, d, hh, mm, lat, lon) {
  const raw = E.calculateNatalChart(y, m, d, hh, mm, lat, lon);
  const p = raw.positions;
  return {
    sunSign: p.sun.sign,
    moonSign: p.moon.sign,
    venusSign: p.venus.sign,
    marsSign: p.mars.sign,
    mercurySign: p.mercury.sign,
    rising: p.asc ? p.asc.sign : p.sun.sign,
    positions: {
      Sun: { lon: p.sun.longitude },
      Moon: { lon: p.moon.longitude },
      Mercury: { lon: p.mercury.longitude },
      Venus: { lon: p.venus.longitude },
      Mars: { lon: p.mars.longitude },
      Jupiter: { lon: p.jupiter.longitude },
      Saturn: { lon: p.saturn.longitude },
    },
  };
}

const c1 = chart(1990, 6, 14, 2, 42, 54.57, -0.9);
const c2 = chart(1988, 3, 21, 14, 30, 51.5, -0.1);
const r = I.calculateCompatibility(c1, c2);

ok('returns overall score', typeof r.overall === 'number' && r.overall >= 20 && r.overall <= 97, r.overall);
ok('has synastry aspects', Array.isArray(r.synastryAspects) && r.synastryAspects.length > 0, r.synastryAspects?.length);
const first = r.synastryAspects[0];
ok('aspect uses p1/p2 fields', !!(first.p1 && first.p2), `${first?.p1}-${first?.p2}`);
ok('aspect orb is numeric string', first && !Number.isNaN(parseFloat(first.orb)), first?.orb);

// Same-sign midpoints would always hit conjunction at 0° — real longitudes should vary.
const allZeroOrb = r.synastryAspects.every(a => parseFloat(a.orb) === 0);
ok('not all aspects are exact 0° (sign-midpoint bug)', !allZeroOrb);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);