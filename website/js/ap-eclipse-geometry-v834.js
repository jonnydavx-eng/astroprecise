/**
 * Pure eclipse geometry for the v834 shadow instrument.
 * No DOM or Three.js dependency: browser UI and Node proof can share the maths.
 */
export const EVENT_MS = Date.UTC(2026, 7, 12, 17, 45, 57);
export const RANGE_START_MS = EVENT_MS - 72 * 60 * 60 * 1000;
export const RANGE_END_MS = EVENT_MS + 48 * 60 * 60 * 1000;

const AU_KM = 149597870.7;
const SUN_RADIUS_KM = 696340;
const MOON_RADIUS_KM = 1737.4;
const EARTH_RADIUS_KM = 6371;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const rad = (d) => d * Math.PI / 180;
const deg = (r) => r * 180 / Math.PI;

function unitFromEcliptic(lonDeg, latDeg) {
  const lon = rad(lonDeg || 0);
  const lat = rad(latDeg || 0);
  const c = Math.cos(lat);
  return [c * Math.cos(lon), Math.sin(lat), c * Math.sin(lon)];
}

function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function scale(a, n) { return [a[0] * n, a[1] * n, a[2] * n]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function subtract(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function length(a) { return Math.hypot(a[0], a[1], a[2]); }
function normalize(a) {
  const n = length(a) || 1;
  return scale(a, 1 / n);
}

export function julianDayForDate(E, date) {
  return E.julianDay(
    date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
    date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()
  );
}

export function computeShadowGeometry(input) {
  const sunUnit = unitFromEcliptic(input.sunLon, input.sunLat || 0);
  const moonUnit = unitFromEcliptic(input.moonLon, input.moonLat || 0);
  const separationDeg = deg(Math.acos(clamp(dot(sunUnit, moonUnit), -1, 1)));
  const deltaLonDeg = ((input.moonLon - input.sunLon + 540) % 360) - 180;
  const deltaLatDeg = (input.moonLat || 0) - (input.sunLat || 0);
  const sunDistanceKm = Math.max(.9, Number(input.sunDistanceAU) || 1) * AU_KM;
  const moonDistanceKm = Number(input.moonDistanceKm) || 384400;
  const sunActual = scale(sunUnit, sunDistanceKm);
  const moonActual = scale(moonUnit, moonDistanceKm);
  const lightAxis = normalize(subtract(moonActual, sunActual));
  const moonToEarthAlongKm = Math.max(1, -dot(moonActual, lightAxis));
  const closestToEarth = add(moonActual, scale(lightAxis, moonToEarthAlongKm));
  const shadowMissKm = length(closestToEarth);
  const sunMoonKm = length(subtract(sunActual, moonActual));
  const umbraLengthKm = MOON_RADIUS_KM * sunMoonKm / (SUN_RADIUS_KM - MOON_RADIUS_KM);
  const umbraRadiusAtEarthKm = Math.max(0, MOON_RADIUS_KM * (1 - moonToEarthAlongKm / umbraLengthKm));
  const penumbraRadiusAtEarthKm = MOON_RADIUS_KM + moonToEarthAlongKm * (SUN_RADIUS_KM + MOON_RADIUS_KM) / sunMoonKm;
  const sunAngularRadius = Math.asin(clamp(SUN_RADIUS_KM / sunDistanceKm, -1, 1));
  const moonAngularRadius = Math.asin(clamp(MOON_RADIUS_KM / moonDistanceKm, -1, 1));

  return {
    sunUnit,
    moonUnit,
    deltaLonDeg,
    deltaLatDeg,
    separationDeg,
    sunDistanceKm,
    moonDistanceKm,
    shadowMissKm,
    sunMoonKm,
    moonToEarthAlongKm,
    umbraLengthKm,
    umbraRadiusAtEarthKm,
    penumbraRadiusAtEarthKm,
    apparentRatio: moonAngularRadius / sunAngularRadius,
    umbraHits: shadowMissKm <= EARTH_RADIUS_KM + umbraRadiusAtEarthKm,
    penumbraHits: shadowMissKm <= EARTH_RADIUS_KM + penumbraRadiusAtEarthKm,
  };
}

export function computeEclipseGeometry(E, date) {
  const jd = julianDayForDate(E, date);
  const sunData = E.sunPosition(jd);
  const moonData = E.moonPosition(jd);
  return {
    jd,
    date,
    sunData,
    moonData,
    ...computeShadowGeometry({
      sunLon: sunData.lon,
      sunLat: sunData.lat || 0,
      sunDistanceAU: sunData.distance,
      moonLon: moonData.lon,
      moonLat: moonData.lat || 0,
      moonDistanceKm: moonData.distance,
    }),
  };
}
