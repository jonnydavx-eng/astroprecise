'use strict';

// Node has no `window`; the browser script attaches its export object to it.
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;

require('./ephemeris.cjs');

const E = globalThis.window.AstroEphemeris;

// Normalize a position to `{ lon, ... }`:
// - sunPosition / moonPosition return { lon, lat, distance } — preserved as-is
// - geocentricPlanetLongitude / chironPosition / lunarNode return plain
//   numbers (degrees) — wrapped as { lon }
function normalize(value) {
  return typeof value === 'number' ? { lon: E.mod360(value) } : { ...value };
}

function allPlanetPositions(jd) {
  const out = {
    Sun:  normalize(E.sunPosition(jd)),
    Moon: normalize(E.moonPosition(jd)),
  };
  for (const name of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) {
    out[name] = normalize(E.geocentricPlanetLongitude(name, jd));
  }
  out.Chiron    = normalize(E.chironPosition(jd));
  out.NorthNode = normalize(E.lunarNode(jd));
  return out;
}

// Spread order matters: this 12-body allPlanetPositions (adds Chiron and
// NorthNode, guarantees `lon` on every entry) shadows the engine's 10-body one.
module.exports = { ...E, allPlanetPositions };
