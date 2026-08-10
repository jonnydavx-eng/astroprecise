import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./website/js/ephemeris.js');
const {
  EVENT_MS,
  RANGE_START_MS,
  RANGE_END_MS,
  computeShadowGeometry,
  computeEclipseGeometry,
} = await import('./website/js/ap-eclipse-geometry-v834.js');

const E = globalThis.AstroEphemeris;
assert.ok(E && E.sunPosition && E.moonPosition, 'browser ephemeris should evaluate under Node');
assert.equal(EVENT_MS, Date.UTC(2026, 7, 12, 17, 45, 57));
assert.equal(EVENT_MS - RANGE_START_MS, 72 * 60 * 60 * 1000);
assert.equal(RANGE_END_MS - EVENT_MS, 48 * 60 * 60 * 1000);

const aligned = computeShadowGeometry({
  sunLon: 140,
  sunLat: 0,
  sunDistanceAU: 1.013,
  moonLon: 140,
  moonLat: 0,
  moonDistanceKm: 367000,
});
assert.ok(aligned.separationDeg < 1e-6, 'perfect alignment should have zero separation');
assert.ok(aligned.shadowMissKm < 1, 'perfect alignment shadow axis should cross Earth centre');
assert.equal(aligned.umbraHits, true, 'a close, aligned Moon should deliver an umbra');

const missed = computeShadowGeometry({
  sunLon: 140,
  sunLat: 0,
  sunDistanceAU: 1.013,
  moonLon: 145,
  moonLat: 1,
  moonDistanceKm: 384400,
});
assert.ok(missed.separationDeg > 5, 'longitude and latitude both contribute to separation');
assert.equal(missed.penumbraHits, false, 'a five-degree miss must not claim an eclipse');

const event = computeEclipseGeometry(E, new Date(EVENT_MS));
assert.ok(event.separationDeg < 1, `greatest eclipse should be tightly aligned (${event.separationDeg}°)`);
assert.ok(event.penumbraHits, 'greatest eclipse penumbra should intersect Earth');
assert.ok(event.moonDistanceKm > 340000 && event.moonDistanceKm < 410000, 'event Moon distance should be physical');
assert.ok(event.apparentRatio > .9 && event.apparentRatio < 1.2, 'event apparent diameters should be comparable');

console.log('PASS dedicated eclipse geometry: pure alignment, miss case, and 2026 event');
