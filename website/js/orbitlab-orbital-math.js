// GENERATED — canonical source: OrbitLab js/. Edit there, sync via scripts/sync-to-astroprecise.mjs
/**
 * OrbitLab — orbital mechanics helpers.
 * Analytical Kepler utilities for guides and education; live positions stay on AstroEphemeris.
 */

const D2R = Math.PI / 180;
const TAU = Math.PI * 2;
const AU_KM = 149597870.7;
const DAY_SEC = 86400;

/** Wrap radians to (−π, π]. */
export function normalizeRad(rad) {
  let x = rad % TAU;
  if (x <= -Math.PI) x += TAU;
  if (x > Math.PI) x -= TAU;
  return x;
}

/** Solve Kepler equation M = E − e sin E (radians) via Newton–Raphson. */
export function solveKepler(meanAnomalyRad, eccentricity, tol = 1e-9) {
  const M = normalizeRad(meanAnomalyRad);
  const e = Math.max(0, Math.min(0.9999, eccentricity));
  let E = e < 0.8 ? M : Math.PI;
  const maxIter = e > 0.9 ? 24 : 16;
  for (let i = 0; i < maxIter; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const d = f / fp;
    E -= d;
    if (Math.abs(d) < tol) break;
  }
  return E;
}

/** Mean anomaly (rad) → true anomaly (rad) for a Keplerian orbit. */
export function meanToTrueAnomaly(meanAnomalyRad, eccentricity) {
  const E = solveKepler(meanAnomalyRad, eccentricity);
  const ta = 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(E / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(E / 2),
  );
  return ta;
}

/** Sidereal rotation rate (rad/s) from equatorial period in hours (negative = retrograde). */
export function siderealSpinRadPerSec(periodHours) {
  if (!periodHours) return 0;
  return (2 * Math.PI) / (Math.abs(periodHours) * 3600) * Math.sign(periodHours || 1);
}

/**
 * Build one lap of a Keplerian guide polyline in scene space.
 * Semi-major axis mapped to schematic orbit radius R; i, Ω, ω applied (degrees).
 */
export function keplerGuidePoints(elements, sceneRadius, segments = 96) {
  const { e, i, Omega, omega } = elements;
  const inc = i * D2R;
  const Om = Omega * D2R;
  const w = omega * D2R;
  const pts = [];
  const cO = Math.cos(Om), sO = Math.sin(Om);
  const ci = Math.cos(inc), si = Math.sin(inc);
  const cw = Math.cos(w), sw = Math.sin(w);

  for (let k = 0; k <= segments; k++) {
    const nu = (k / segments) * Math.PI * 2;
    const r = sceneRadius * (1 - e * e) / (1 + e * Math.cos(nu));
    const xp = r * Math.cos(nu);
    const yp = r * Math.sin(nu);
    // Perifocal → ecliptic: R_z(-ω) R_x(-i) R_z(-Ω) convention
    const x1 = xp * cw - yp * sw;
    const y1 = xp * sw + yp * cw;
    const x2 = x1;
    const y2 = y1 * ci;
    const z2 = y1 * si;
    const x = x2 * cO - y2 * sO;
    const y = x2 * sO + y2 * cO;
    const z = z2;
    pts.push({ x, y: y * 0.35, z: -y }); // match scenePos ecliptic flattening
  }
  return pts;
}

/** Heliocentric ecliptic state from AstroEphemeris (AU, degrees). */
export function helioStateFromEphemeris(E, id, jd, norm360) {
  const sun = E.sunPosition(jd);
  if (id === 'earth') {
    const lo = (sun.lon + 180) * D2R;
    const hx = sun.distance * Math.cos(lo);
    const hy = sun.distance * Math.sin(lo);
    return {
      lon: norm360(sun.lon + 180),
      lat: 0,
      distanceAU: sun.distance,
      helioX: hx,
      helioY: hy,
      helioZ: 0,
    };
  }
  const g = E[id + 'Position'](jd);
  const lo = sun.lon * D2R;
  const gx = g.distance * Math.cos(g.lat * D2R) * Math.cos(g.lon * D2R);
  const gy = g.distance * Math.cos(g.lat * D2R) * Math.sin(g.lon * D2R);
  const gz = g.distance * Math.sin(g.lat * D2R);
  const sx = sun.distance * Math.cos(lo);
  const sy = sun.distance * Math.sin(lo);
  const hx = gx - sx, hy = gy - sy, hz = gz;
  const r = Math.hypot(hx, hy, hz) || 1e-9;
  return {
    lon: norm360(Math.atan2(hy, hx) / D2R),
    lat: Math.asin(hz / r) / D2R,
    distanceAU: r,
    helioX: hx,
    helioY: hy,
    helioZ: hz,
  };
}

/** Finite-difference heliocentric speed magnitude (km/s) from VSOP87 samples. */
export function estimateHelioSpeedKmS(E, id, jd, norm360, dtDays = 0.25) {
  const a = helioStateFromEphemeris(E, id, jd - dtDays, norm360);
  const b = helioStateFromEphemeris(E, id, jd + dtDays, norm360);
  if (a.helioX == null || b.helioX == null) return null;
  const dx = (b.helioX - a.helioX) * AU_KM;
  const dy = (b.helioY - a.helioY) * AU_KM;
  const dz = (b.helioZ - a.helioZ) * AU_KM;
  const dt = 2 * dtDays * DAY_SEC;
  return Math.hypot(dx, dy, dz) / dt;
}

/** Adaptive Δt — smaller step when the body moves quickly (Mercury, Moon context). */
export function adaptiveHelioSpeedKmS(E, id, jd, norm360) {
  let dt = 0.25;
  let best = estimateHelioSpeedKmS(E, id, jd, norm360, dt);
  if (best == null) return null;
  for (let pass = 0; pass < 2; pass++) {
    const trial = estimateHelioSpeedKmS(E, id, jd, norm360, dt * 0.5);
    if (trial == null) break;
    if (Math.abs(trial - best) / Math.max(best, 0.1) > 0.08) {
      dt *= 0.5;
      best = trial;
    } else break;
  }
  return best;
}

const MOON_PHASES = [
  [0, 'New Moon', 0],
  [45, 'Waxing Crescent', 0.125],
  [90, 'First Quarter', 0.25],
  [135, 'Waxing Gibbous', 0.375],
  [180, 'Full Moon', 0.5],
  [225, 'Waning Gibbous', 0.625],
  [270, 'Last Quarter', 0.75],
  [315, 'Waning Crescent', 0.875],
  [360, 'New Moon', 0],
];

/** Geocentric Moon phase from VSOP87 Sun + ELP Moon longitudes. */
export function moonPhaseFromEphemeris(E, jd) {
  if (!E || typeof E.sunPosition !== 'function' || typeof E.moonPosition !== 'function') {
    return { label: '—', elongationDeg: null, illumination: null };
  }
  const sunLon = E.sunPosition(jd).lon;
  const moonLon = E.moonPosition(jd).lon;
  const elong = ((moonLon - sunLon) % 360 + 360) % 360;
  let label = 'New Moon';
  let illumination = 0;
  for (let i = 0; i < MOON_PHASES.length - 1; i++) {
    if (elong >= MOON_PHASES[i][0] && elong < MOON_PHASES[i + 1][0]) {
      label = MOON_PHASES[i][1];
      illumination = MOON_PHASES[i][2];
      break;
    }
  }
  illumination = 0.5 * (1 - Math.cos(elong * D2R));
  return { label, elongationDeg: elong, illumination };
}

/**
 * Integrate simulation clock with sub-steps so VSOP87 stays stable at high speeds.
 * Returns new dayOffset after advancing daysPerSec * dt seconds of sim time.
 */
export function integrateDayOffset(dayOffset, daysPerSec, dtSec, maxStepDays = 2) {
  if (!daysPerSec || !dtSec) return dayOffset;
  let remaining = daysPerSec * dtSec;
  let offset = dayOffset;
  const sign = Math.sign(remaining) || 1;
  remaining = Math.abs(remaining);
  while (remaining > 1e-9) {
    const step = Math.min(remaining, maxStepDays);
    offset += sign * step;
    remaining -= step;
  }
  return offset;
}

export { AU_KM, DAY_SEC };