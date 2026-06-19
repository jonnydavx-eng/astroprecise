'use strict';

// Node has no `window`; the browser script attaches its export object to it.
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;

require('./ephemeris.cjs');

const E = globalThis.window.AstroEphemeris;

// Normalize a position to `{ lon, ... }`:
// - sunPosition / moonPosition / <planet>Position return { lon, lat, distance }
// - chironPosition / lunarNode return plain numbers (degrees) — wrapped as { lon }
function normalize(value) {
  return typeof value === 'number' ? { lon: E.mod360(value) } : { ...value };
}

// Adds Chiron + NorthNode to the engine's 10-body set and guarantees `lon` on
// every entry. Uses the engine's per-planet functions (the old single
// `geocentricPlanetLongitude(name, jd)` entry point was refactored away).
function allPlanetPositions(jd) {
  const base = E.allPlanetPositions(jd); // Sun, Moon, Mercury…Pluto ({ lon, … })
  const out = {};
  for (const name of Object.keys(base)) out[name] = normalize(base[name]);
  out.Chiron    = normalize(E.chironPosition(jd));
  out.NorthNode = normalize(E.lunarNode(jd));
  return out;
}

// Spread order matters: this 12-body allPlanetPositions (adds Chiron and
// NorthNode, guarantees `lon` on every entry) shadows the engine's 10-body one.
module.exports = { ...E, allPlanetPositions };
