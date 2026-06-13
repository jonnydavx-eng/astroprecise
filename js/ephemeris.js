'use strict';

// =============================================================================
// AstroPrecise Ephemeris Engine
// Based on Meeus "Astronomical Algorithms" 2nd Edition
// =============================================================================

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function mod360(x) {
  return ((x % 360) + 360) % 360;
}

function toRad(deg) {
  return deg * Math.PI / 180;
}

function toDeg(rad) {
  return rad * 180 / Math.PI;
}

// ---------------------------------------------------------------------------
// 1. Julian Day Number  (Meeus Ch 7)
// ---------------------------------------------------------------------------

function julianDay(year, month, day, hour, min, sec) {
  // Coerce — a string "12" would otherwise concatenate in the hour math below
  // and silently throw the date off by ~50 days.
  year = +year; month = +month; day = +day;
  hour = (+hour || 0) + (+min || 0) / 60 + (+sec || 0) / 3600;
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) +
         Math.floor(30.6001 * (month + 1)) +
         day + hour / 24 + B - 1524.5;
}

// ---------------------------------------------------------------------------
// 2. Obliquity of Ecliptic — Laskar 1986 series  (Meeus Ch 22)
// ---------------------------------------------------------------------------

function obliquityOfEcliptic(T) {
  // T = Julian centuries from J2000.0
  const U = T / 100;
  const eps0 = 23 * 3600 + 26 * 60 + 21.448
    - 4680.93  * U
    -    1.55  * U*U
    + 1999.25  * U**3
    -   51.38  * U**4
    -  249.67  * U**5
    -   39.05  * U**6
    +    7.12  * U**7
    +   27.87  * U**8
    +    5.79  * U**9
    +    2.45  * U**10;
  return eps0 / 3600; // degrees
}

// ---------------------------------------------------------------------------
// 4. Greenwich Sidereal Time  (Meeus Ch 12)
// ---------------------------------------------------------------------------

function greenwichSiderealTime(jd) {
  const T = (jd - 2451545.0) / 36525;
  let theta = 280.46061837
    + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T
    - T * T * T / 38710000;
  return mod360(theta); // degrees
}

// ---------------------------------------------------------------------------
// 5. Local Sidereal Time
// ---------------------------------------------------------------------------

function localSiderealTime(jd, longitude) {
  return mod360(greenwichSiderealTime(jd) + longitude);
}

// ---------------------------------------------------------------------------
// 6. Sun Position  (Meeus Ch 25)
// ---------------------------------------------------------------------------

function sunPosition(jd) {
  const T = (jd - 2451545.0) / 36525;

  // Geometric mean longitude & mean anomaly
  const L0 = mod360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M  = mod360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mr = toRad(M);
  const e  = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;

  // Equation of centre
  const C = (1.914602 - 0.004817*T - 0.000014*T*T) * Math.sin(Mr)
          + (0.019993 - 0.000101*T) * Math.sin(2*Mr)
          +  0.000289 * Math.sin(3*Mr);

  const sunLon = mod360(L0 + C);
  const v      = mod360(M + C);
  const R      = 1.000001018 * (1 - e*e) / (1 + e * Math.cos(toRad(v)));

  // Apparent longitude (nutation + aberration)
  const Om = mod360(125.04 - 1934.136 * T);
  const lam = mod360(sunLon - 0.00569 - 0.00478 * Math.sin(toRad(Om)));

  return { lon: lam, lat: 0, distance: R }; // R in AU
}

// ---------------------------------------------------------------------------
// 9. Ascendant
// ---------------------------------------------------------------------------

function ascendant(lst, lat, eps) {
  // ARMC-based oblique ascension formula (Meeus Ch 14):
  //   ASC = atan2( cos(RAMC), -( sin(RAMC)·cosε + tanφ·sinε ) )
  // The previous version negated BOTH atan2 arguments, which is an exact
  // 180° flip — every rising sign it ever produced was the Descendant.
  // (Caught 2026-06-12: pre-dawn birth, Sun ~50 min below the eastern
  // horizon at 83° λ, yet ASC came back 247°. True ASC must sit just
  // behind a rising Sun.)
  const lstR = toRad(lst);
  const latR = toRad(lat);
  const epsR = toRad(eps);

  const y = Math.cos(lstR);
  const x = -(Math.sin(lstR) * Math.cos(epsR) + Math.tan(latR) * Math.sin(epsR));
  return mod360(toDeg(Math.atan2(y, x)));
}

// ---------------------------------------------------------------------------
// 10. Midheaven (MC)
// ---------------------------------------------------------------------------

function midheaven(lst, eps) {
  const lstR = toRad(lst);
  const epsR = toRad(eps);
  let mc = toDeg(Math.atan2(Math.sin(lstR), Math.cos(lstR) * Math.cos(epsR)));
  return mod360(mc);
}

// ---------------------------------------------------------------------------
// 11. Placidus Houses
// ---------------------------------------------------------------------------

// Ecliptic longitude of the point on the ecliptic whose right ascension is raDeg.
function eclLonFromRA(raDeg, epsDeg) {
  const ra = toRad(raDeg), e = toRad(epsDeg);
  return mod360(toDeg(Math.atan2(Math.sin(ra) * Math.cos(e), Math.cos(ra))));
}

// Correct Placidus via the semi-arc method. ramc = right ascension of the MC
// (= local sidereal time in degrees). Each intermediate cusp's meridian
// distance is a fixed fraction (1/3, 2/3) of that cusp point's OWN semi-arc,
// solved iteratively. Returns null in the circumpolar case (Placidus is
// undefined there) so the caller can fall back to a quadrant system.
function placidusCusps(ramc, ascDeg, mcDeg, lat, eps) {
  const phi = toRad(lat), e = toRad(eps);
  function solve(f, below) {
    let ra = ramc + (below ? 180 - f * 90 : f * 90);
    for (let i = 0; i < 80; i++) {
      const L   = eclLonFromRA(ra, eps);
      const dec = Math.asin(Math.sin(e) * Math.sin(toRad(L)));
      const t   = -Math.tan(phi) * Math.tan(dec);
      if (Math.abs(t) >= 1) return null;            // circumpolar
      const SA  = toDeg(Math.acos(t));              // semi-diurnal arc (deg)
      const raNew = below ? (ramc + 180 - f * (180 - SA)) : (ramc + f * SA);
      if (Math.abs(((raNew - ra + 540) % 360) - 180) < 1e-9) { ra = raNew; break; }
      ra = raNew;
    }
    return eclLonFromRA(ra, eps);
  }
  const H11 = solve(1/3, false), H12 = solve(2/3, false);
  const H2  = solve(2/3, true),  H3  = solve(1/3, true);
  if ([H11, H12, H2, H3].some(c => c === null)) return null;
  return [ascDeg, H2, H3, mod360(mcDeg + 180), mod360(H11 + 180), mod360(H12 + 180),
          mod360(ascDeg + 180), mod360(H2 + 180), mod360(H3 + 180), mcDeg, H11, H12];
}

// Porphyry — trisect each ecliptic quadrant between the true angles. Always
// monotonic; the robust quadrant fallback when Placidus is circumpolar.
function porphyryCusps(ascDeg, mcDeg) {
  const ic = mod360(mcDeg + 180), dsc = mod360(ascDeg + 180);
  const arc = (a, b) => mod360(b - a);
  const qA = arc(ascDeg, ic), qB = arc(ic, dsc), qC = arc(dsc, mcDeg), qD = arc(mcDeg, ascDeg);
  return [
    ascDeg, mod360(ascDeg + qA/3), mod360(ascDeg + 2*qA/3),
    ic,     mod360(ic + qB/3),     mod360(ic + 2*qB/3),
    dsc,    mod360(dsc + qC/3),    mod360(dsc + 2*qC/3),
    mcDeg,  mod360(mcDeg + qD/3),  mod360(mcDeg + 2*qD/3),
  ];
}

// House-system dispatcher. Default Placidus (with graceful quadrant fallback).
function houseCusps(system, lst, lat, eps, ascDeg, mcDeg) {
  switch ((system || 'placidus').toLowerCase()) {
    case 'whole': {
      const s0 = Math.floor(ascDeg / 30) * 30;
      return Array.from({ length: 12 }, (_, i) => mod360(s0 + i * 30));
    }
    case 'equal':
      return Array.from({ length: 12 }, (_, i) => mod360(ascDeg + i * 30));
    case 'porphyry':
      return porphyryCusps(ascDeg, mcDeg);
    case 'placidus':
    default:
      return placidusCusps(lst, ascDeg, mcDeg, lat, eps) || porphyryCusps(ascDeg, mcDeg);
  }
}

// Back-compatible export: derive RAMC from the MC longitude.
function placidusHouses(mc_lon, asc_lon, lat, eps) {
  const ramc = mod360(toDeg(Math.atan2(
    Math.sin(toRad(mc_lon)) * Math.cos(toRad(eps)), Math.cos(toRad(mc_lon)))));
  return placidusCusps(ramc, asc_lon, mc_lon, lat, eps) || porphyryCusps(asc_lon, mc_lon);
}

// ---------------------------------------------------------------------------
// 12. Aspects
// ---------------------------------------------------------------------------

const ASPECT_DEFS = [
  { name: 'conjunction',    angle:   0, orb: 8 },
  { name: 'opposition',     angle: 180, orb: 8 },
  { name: 'trine',          angle: 120, orb: 7 },
  { name: 'square',         angle:  90, orb: 7 },
  { name: 'sextile',        angle:  60, orb: 5 },
  { name: 'quincunx',       angle: 150, orb: 3 },
  { name: 'semisquare',     angle:  45, orb: 2 },
  { name: 'sesquiquadrate', angle: 135, orb: 2 },
  { name: 'semisextile',    angle:  30, orb: 2 },
  { name: 'quintile',       angle:  72, orb: 1 },
];

// Approximate mean daily motion in degrees/day for applying detection
const DAILY_MOTION = {
  sun: 0.9856, moon: 13.176, mercury: 1.383, venus: 1.202, mars: 0.524,
  jupiter: 0.0831, saturn: 0.0335, uranus: 0.0117, neptune: 0.0060,
  pluto: 0.0040, chiron: 0.014, northnode: -0.053, southnode: 0.053,
  asc: 0, mc: 0
};

function calculateAspects(positions, jd) {
  const aspects = [];
  const keys = Object.keys(positions);

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const p1 = keys[i];
      const p2 = keys[j];
      // North & South Node are 180° apart by definition — skip that artifact,
      // which would otherwise appear as a fake "opposition" in every chart.
      if ((p1 === 'northNode' && p2 === 'southNode') || (p1 === 'southNode' && p2 === 'northNode')) continue;
      const lon1 = typeof positions[p1] === 'object' ? positions[p1].longitude : positions[p1];
      const lon2 = typeof positions[p2] === 'object' ? positions[p2].longitude : positions[p2];

      let diff = Math.abs(lon1 - lon2);
      if (diff > 180) diff = 360 - diff;

      for (const asp of ASPECT_DEFS) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          // Applying: the orb is closing (faster planet approaching exact aspect)
          let applying = false;
          const dm1 = DAILY_MOTION[p1.toLowerCase()] || 0;
          const dm2 = DAILY_MOTION[p2.toLowerCase()] || 0;
          const relSpeed = dm1 - dm2;
          const signedDiff = lon1 - lon2;
          // Normalise signed difference to -180..180
          const sd = ((signedDiff % 360) + 540) % 360 - 180;
          applying = (relSpeed * sd) < 0;
          aspects.push({ planet1: p1, planet2: p2, aspect: asp.name, orb: +orb.toFixed(4), applying });
        }
      }
    }
  }
  return aspects;
}

// ---------------------------------------------------------------------------
// 13. Retrograde
// ---------------------------------------------------------------------------

// Accurate geocentric longitude. Routes planets through the full VSOP87
// series (mercuryPosition…plutoPosition) instead of the crude fixed-radius
// planar geocentricPlanetLongitude — which put Pluto a whole sign (65°) wrong
// and Mars ~4° off, crossing sign boundaries. Function declarations are
// hoisted, so referencing the later-defined position functions here is safe.
const _ACCURATE_FNS = {
  mercury: () => mercuryPosition, venus: () => venusPosition, mars: () => marsPosition,
  jupiter: () => jupiterPosition, saturn: () => saturnPosition, uranus: () => uranusPosition,
  neptune: () => neptunePosition, pluto: () => plutoPosition,
};
function planetLongitude(planet, jd) {
  const p = planet.toLowerCase();
  if (p === 'sun')  return sunPosition(jd).lon;
  if (p === 'moon') return moonPosition(jd).lon;
  if (p === 'chiron') return chironPosition(jd);
  if (p === 'northnode') return lunarNode(jd);
  if (p === 'southnode') return mod360(lunarNode(jd) + 180);
  if (_ACCURATE_FNS[p]) return _ACCURATE_FNS[p]()(jd).lon;
  throw new Error('planetLongitude: unknown body ' + planet);
}

function isRetrograde(planet, jd) {
  const p = planet.toLowerCase();
  if (p === 'sun' || p === 'moon' || p === 'northnode' || p === 'southnode') return false;
  const lon1 = planetLongitude(p, jd);
  const lon2 = planetLongitude(p, jd + 1);
  let motion = lon2 - lon1;
  if (motion > 180)  motion -= 360;
  if (motion < -180) motion += 360;
  return motion < 0;
}

// ---------------------------------------------------------------------------
// Mean Lunar Node and Chiron
// ---------------------------------------------------------------------------

function lunarNode(jd) {
  const T = (jd - 2451545.0) / 36525;
  return mod360(125.04452 - 1934.136261*T + 0.0020708*T*T + T*T*T/450000);
}

function chironPosition(jd) {
  // Chiron (2060) — approximate mean longitude using orbital period 50.42 yr
  const epoch_jd  = 2451545.0; // J2000.0
  const epoch_lon = 209.39;    // approximate ecliptic longitude at J2000.0 (degrees)
  const period    = 50.42 * 365.25; // days
  return mod360(epoch_lon + 360 * (jd - epoch_jd) / period);
}

// ---------------------------------------------------------------------------
// Sign helpers
// ---------------------------------------------------------------------------

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
];

function signOf(lon) {
  return SIGNS[Math.floor(mod360(lon) / 30)];
}

function degreeInSign(lon) {
  return mod360(lon) % 30;
}

const ELEMENTS = {
  Aries:'Fire',  Leo:'Fire',  Sagittarius:'Fire',
  Taurus:'Earth',Virgo:'Earth',Capricorn:'Earth',
  Gemini:'Air',  Libra:'Air', Aquarius:'Air',
  Cancer:'Water',Scorpio:'Water',Pisces:'Water'
};

const MODALITIES = {
  Aries:'Cardinal',Cancer:'Cardinal',Libra:'Cardinal',Capricorn:'Cardinal',
  Taurus:'Fixed', Leo:'Fixed',  Scorpio:'Fixed',  Aquarius:'Fixed',
  Gemini:'Mutable',Virgo:'Mutable',Sagittarius:'Mutable',Pisces:'Mutable'
};

const SIGN_RULERS = {
  Aries:'mars',      Taurus:'venus',   Gemini:'mercury', Cancer:'moon',
  Leo:'sun',         Virgo:'mercury',  Libra:'venus',    Scorpio:'pluto',
  Sagittarius:'jupiter', Capricorn:'saturn', Aquarius:'uranus', Pisces:'neptune'
};

// ---------------------------------------------------------------------------
// 14. calculateNatalChart — main entry point
// ---------------------------------------------------------------------------

function calculateNatalChart(year, month, day, hour, minute, lat, lon, houseSystem) {
  // Reject impossible inputs rather than return a confident fake chart
  // (the ethos: never present a number that isn't real).
  lat = +lat; lon = +lon;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90)
    throw new RangeError(`Invalid latitude ${lat} (expected -90..90)`);
  if (!Number.isFinite(lon) || lon < -180 || lon > 180)
    throw new RangeError(`Invalid longitude ${lon} (expected -180..180)`);
  if (![+year, +month, +day, +hour, +minute].every(Number.isFinite))
    throw new RangeError('Invalid birth date/time — non-numeric component');

  const jd  = julianDay(year, month, day, hour, minute, 0);
  const T   = (jd - 2451545.0) / 36525;
  const eps = obliquityOfEcliptic(T);
  const lst = localSiderealTime(jd, lon);

  const sunPos  = sunPosition(jd);
  const moonPos = moonPosition(jd);

  const outerPlanets = ['mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
  const rawPositions = {};
  for (const p of outerPlanets) {
    rawPositions[p] = planetLongitude(p, jd);
  }
  rawPositions.sun   = sunPos.lon;
  rawPositions.moon  = moonPos.lon;
  rawPositions.chiron     = chironPosition(jd);
  rawPositions.northNode  = lunarNode(jd);
  rawPositions.southNode  = mod360(rawPositions.northNode + 180);

  const ascDeg = ascendant(lst, lat, eps);
  const mcDeg  = midheaven(lst, eps);
  rawPositions.asc = ascDeg;
  rawPositions.mc  = mcDeg;

  const houses = houseCusps(houseSystem, lst, lat, eps, ascDeg, mcDeg);

  // Build detailed position objects
  const retroPlanets = new Set(['mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron']);
  const positions = {};
  for (const [name, longitude] of Object.entries(rawPositions)) {
    positions[name] = {
      longitude,
      sign:      signOf(longitude),
      degree:    +degreeInSign(longitude).toFixed(4),
      retrograde: retroPlanets.has(name) ? isRetrograde(name, jd) : false,
    };
  }

  // Aspect grid
  const aspects = calculateAspects(rawPositions, jd);

  // Dominant element & modality (core 7 planets)
  const elementCount  = { Fire:0, Earth:0, Air:0, Water:0 };
  const modalityCount = { Cardinal:0, Fixed:0, Mutable:0 };
  for (const p of ['sun','moon','mercury','venus','mars','jupiter','saturn']) {
    const sign = positions[p].sign;
    // guard: an undefined sign must not fabricate a dominant element
    if (ELEMENTS[sign])  elementCount[ELEMENTS[sign]]++;
    if (MODALITIES[sign]) modalityCount[MODALITIES[sign]]++;
  }
  const dominantElement  = Object.entries(elementCount).sort((a,b) => b[1]-a[1])[0][0];
  const dominantModality = Object.entries(modalityCount).sort((a,b) => b[1]-a[1])[0][0];

  const ascSign    = signOf(ascDeg);
  const chartRuler = SIGN_RULERS[ascSign];

  return {
    jd,
    positions,
    houses,
    aspects,
    dominantElement,
    dominantModality,
    chartRuler,
    ascendant: ascDeg,
    midheaven: mcDeg,
    obliquity: eps,
  };
}

// ---------------------------------------------------------------------------
// 15. City database — 150+ cities
// ---------------------------------------------------------------------------

const CITIES = [
  // United States (25 cities)
  { name:'New York',         country:'US', lat: 40.7128, lon: -74.0060, tz:'America/New_York' },
  { name:'Los Angeles',      country:'US', lat: 34.0522, lon:-118.2437, tz:'America/Los_Angeles' },
  { name:'Chicago',          country:'US', lat: 41.8781, lon: -87.6298, tz:'America/Chicago' },
  { name:'Houston',          country:'US', lat: 29.7604, lon: -95.3698, tz:'America/Chicago' },
  { name:'Phoenix',          country:'US', lat: 33.4484, lon:-112.0740, tz:'America/Phoenix' },
  { name:'Philadelphia',     country:'US', lat: 39.9526, lon: -75.1652, tz:'America/New_York' },
  { name:'San Antonio',      country:'US', lat: 29.4241, lon: -98.4936, tz:'America/Chicago' },
  { name:'San Diego',        country:'US', lat: 32.7157, lon:-117.1611, tz:'America/Los_Angeles' },
  { name:'Dallas',           country:'US', lat: 32.7767, lon: -96.7970, tz:'America/Chicago' },
  { name:'San Jose',         country:'US', lat: 37.3382, lon:-121.8863, tz:'America/Los_Angeles' },
  { name:'Austin',           country:'US', lat: 30.2672, lon: -97.7431, tz:'America/Chicago' },
  { name:'Jacksonville',     country:'US', lat: 30.3322, lon: -81.6557, tz:'America/New_York' },
  { name:'Fort Worth',       country:'US', lat: 32.7555, lon: -97.3308, tz:'America/Chicago' },
  { name:'Columbus',         country:'US', lat: 39.9612, lon: -82.9988, tz:'America/New_York' },
  { name:'Indianapolis',     country:'US', lat: 39.7684, lon: -86.1581, tz:'America/Indiana/Indianapolis' },
  { name:'Charlotte',        country:'US', lat: 35.2271, lon: -80.8431, tz:'America/New_York' },
  { name:'San Francisco',    country:'US', lat: 37.7749, lon:-122.4194, tz:'America/Los_Angeles' },
  { name:'Seattle',          country:'US', lat: 47.6062, lon:-122.3321, tz:'America/Los_Angeles' },
  { name:'Denver',           country:'US', lat: 39.7392, lon:-104.9903, tz:'America/Denver' },
  { name:'Nashville',        country:'US', lat: 36.1627, lon: -86.7816, tz:'America/Chicago' },
  { name:'Miami',            country:'US', lat: 25.7617, lon: -80.1918, tz:'America/New_York' },
  { name:'Atlanta',          country:'US', lat: 33.7490, lon: -84.3880, tz:'America/New_York' },
  { name:'Minneapolis',      country:'US', lat: 44.9778, lon: -93.2650, tz:'America/Chicago' },
  { name:'Portland',         country:'US', lat: 45.5051, lon:-122.6750, tz:'America/Los_Angeles' },
  { name:'Las Vegas',        country:'US', lat: 36.1699, lon:-115.1398, tz:'America/Los_Angeles' },
  // European Capitals & major cities
  { name:'London',           country:'GB', lat: 51.5074, lon:  -0.1278, tz:'Europe/London' },
  { name:'Paris',            country:'FR', lat: 48.8566, lon:   2.3522, tz:'Europe/Paris' },
  { name:'Berlin',           country:'DE', lat: 52.5200, lon:  13.4050, tz:'Europe/Berlin' },
  { name:'Madrid',           country:'ES', lat: 40.4168, lon:  -3.7038, tz:'Europe/Madrid' },
  { name:'Rome',             country:'IT', lat: 41.9028, lon:  12.4964, tz:'Europe/Rome' },
  { name:'Vienna',           country:'AT', lat: 48.2082, lon:  16.3738, tz:'Europe/Vienna' },
  { name:'Amsterdam',        country:'NL', lat: 52.3676, lon:   4.9041, tz:'Europe/Amsterdam' },
  { name:'Brussels',         country:'BE', lat: 50.8503, lon:   4.3517, tz:'Europe/Brussels' },
  { name:'Warsaw',           country:'PL', lat: 52.2297, lon:  21.0122, tz:'Europe/Warsaw' },
  { name:'Prague',           country:'CZ', lat: 50.0755, lon:  14.4378, tz:'Europe/Prague' },
  { name:'Stockholm',        country:'SE', lat: 59.3293, lon:  18.0686, tz:'Europe/Stockholm' },
  { name:'Oslo',             country:'NO', lat: 59.9139, lon:  10.7522, tz:'Europe/Oslo' },
  { name:'Copenhagen',       country:'DK', lat: 55.6761, lon:  12.5683, tz:'Europe/Copenhagen' },
  { name:'Helsinki',         country:'FI', lat: 60.1699, lon:  24.9384, tz:'Europe/Helsinki' },
  { name:'Lisbon',           country:'PT', lat: 38.7223, lon:  -9.1393, tz:'Europe/Lisbon' },
  { name:'Athens',           country:'GR', lat: 37.9838, lon:  23.7275, tz:'Europe/Athens' },
  { name:'Budapest',         country:'HU', lat: 47.4979, lon:  19.0402, tz:'Europe/Budapest' },
  { name:'Bucharest',        country:'RO', lat: 44.4268, lon:  26.1025, tz:'Europe/Bucharest' },
  { name:'Kyiv',             country:'UA', lat: 50.4501, lon:  30.5234, tz:'Europe/Kiev' },
  { name:'Moscow',           country:'RU', lat: 55.7558, lon:  37.6173, tz:'Europe/Moscow' },
  { name:'Sofia',            country:'BG', lat: 42.6977, lon:  23.3219, tz:'Europe/Sofia' },
  { name:'Belgrade',         country:'RS', lat: 44.8176, lon:  20.4569, tz:'Europe/Belgrade' },
  { name:'Zagreb',           country:'HR', lat: 45.8150, lon:  15.9819, tz:'Europe/Zagreb' },
  { name:'Bern',             country:'CH', lat: 46.9481, lon:   7.4474, tz:'Europe/Zurich' },
  { name:'Dublin',           country:'IE', lat: 53.3498, lon:  -6.2603, tz:'Europe/Dublin' },
  { name:'Riga',             country:'LV', lat: 56.9496, lon:  24.1052, tz:'Europe/Riga' },
  { name:'Vilnius',          country:'LT', lat: 54.6872, lon:  25.2797, tz:'Europe/Vilnius' },
  { name:'Tallinn',          country:'EE', lat: 59.4370, lon:  24.7536, tz:'Europe/Tallinn' },
  { name:'Reykjavik',        country:'IS', lat: 64.1355, lon: -21.8954, tz:'Atlantic/Reykjavik' },
  { name:'Luxembourg',       country:'LU', lat: 49.6117, lon:   6.1319, tz:'Europe/Luxembourg' },
  { name:'Valletta',         country:'MT', lat: 35.8997, lon:  14.5147, tz:'Europe/Malta' },
  { name:'Nicosia',          country:'CY', lat: 35.1856, lon:  33.3823, tz:'Asia/Nicosia' },
  { name:'Ankara',           country:'TR', lat: 39.9334, lon:  32.8597, tz:'Europe/Istanbul' },
  { name:'Istanbul',         country:'TR', lat: 41.0082, lon:  28.9784, tz:'Europe/Istanbul' },
  { name:'Ljubljana',        country:'SI', lat: 46.0569, lon:  14.5058, tz:'Europe/Ljubljana' },
  { name:'Sarajevo',         country:'BA', lat: 43.8563, lon:  18.4131, tz:'Europe/Sarajevo' },
  { name:'Skopje',           country:'MK', lat: 41.9973, lon:  21.4280, tz:'Europe/Skopje' },
  { name:'Tirana',           country:'AL', lat: 41.3275, lon:  19.8187, tz:'Europe/Tirane' },
  { name:'Podgorica',        country:'ME', lat: 42.4304, lon:  19.2594, tz:'Europe/Podgorica' },
  { name:'Chisinau',         country:'MD', lat: 47.0105, lon:  28.8638, tz:'Europe/Chisinau' },
  // Major Asian cities
  { name:'Tokyo',            country:'JP', lat: 35.6762, lon: 139.6503, tz:'Asia/Tokyo' },
  { name:'Beijing',          country:'CN', lat: 39.9042, lon: 116.4074, tz:'Asia/Shanghai' },
  { name:'Shanghai',         country:'CN', lat: 31.2304, lon: 121.4737, tz:'Asia/Shanghai' },
  { name:'Hong Kong',        country:'HK', lat: 22.3193, lon: 114.1694, tz:'Asia/Hong_Kong' },
  { name:'Seoul',            country:'KR', lat: 37.5665, lon: 126.9780, tz:'Asia/Seoul' },
  { name:'Mumbai',           country:'IN', lat: 19.0760, lon:  72.8777, tz:'Asia/Kolkata' },
  { name:'Delhi',            country:'IN', lat: 28.6139, lon:  77.2090, tz:'Asia/Kolkata' },
  { name:'Bangalore',        country:'IN', lat: 12.9716, lon:  77.5946, tz:'Asia/Kolkata' },
  { name:'Chennai',          country:'IN', lat: 13.0827, lon:  80.2707, tz:'Asia/Kolkata' },
  { name:'Kolkata',          country:'IN', lat: 22.5726, lon:  88.3639, tz:'Asia/Kolkata' },
  { name:'Singapore',        country:'SG', lat:  1.3521, lon: 103.8198, tz:'Asia/Singapore' },
  { name:'Bangkok',          country:'TH', lat: 13.7563, lon: 100.5018, tz:'Asia/Bangkok' },
  { name:'Jakarta',          country:'ID', lat: -6.2088, lon: 106.8456, tz:'Asia/Jakarta' },
  { name:'Kuala Lumpur',     country:'MY', lat:  3.1390, lon: 101.6869, tz:'Asia/Kuala_Lumpur' },
  { name:'Manila',           country:'PH', lat: 14.5995, lon: 120.9842, tz:'Asia/Manila' },
  { name:'Taipei',           country:'TW', lat: 25.0330, lon: 121.5654, tz:'Asia/Taipei' },
  { name:'Dhaka',            country:'BD', lat: 23.8103, lon:  90.4125, tz:'Asia/Dhaka' },
  { name:'Karachi',          country:'PK', lat: 24.8607, lon:  67.0011, tz:'Asia/Karachi' },
  { name:'Lahore',           country:'PK', lat: 31.5497, lon:  74.3436, tz:'Asia/Karachi' },
  { name:'Islamabad',        country:'PK', lat: 33.6844, lon:  73.0479, tz:'Asia/Karachi' },
  { name:'Colombo',          country:'LK', lat:  6.9271, lon:  79.8612, tz:'Asia/Colombo' },
  { name:'Kathmandu',        country:'NP', lat: 27.7172, lon:  85.3240, tz:'Asia/Kathmandu' },
  { name:'Riyadh',           country:'SA', lat: 24.7136, lon:  46.6753, tz:'Asia/Riyadh' },
  { name:'Dubai',            country:'AE', lat: 25.2048, lon:  55.2708, tz:'Asia/Dubai' },
  { name:'Abu Dhabi',        country:'AE', lat: 24.4539, lon:  54.3773, tz:'Asia/Dubai' },
  { name:'Tehran',           country:'IR', lat: 35.6892, lon:  51.3890, tz:'Asia/Tehran' },
  { name:'Baghdad',          country:'IQ', lat: 33.3152, lon:  44.3661, tz:'Asia/Baghdad' },
  { name:'Kabul',            country:'AF', lat: 34.5553, lon:  69.2075, tz:'Asia/Kabul' },
  { name:'Tashkent',         country:'UZ', lat: 41.2995, lon:  69.2401, tz:'Asia/Tashkent' },
  { name:'Almaty',           country:'KZ', lat: 43.2220, lon:  76.8512, tz:'Asia/Almaty' },
  { name:'Ulaanbaatar',      country:'MN', lat: 47.8864, lon: 106.9057, tz:'Asia/Ulaanbaatar' },
  { name:'Hanoi',            country:'VN', lat: 21.0285, lon: 105.8542, tz:'Asia/Ho_Chi_Minh' },
  { name:'Ho Chi Minh City', country:'VN', lat: 10.8231, lon: 106.6297, tz:'Asia/Ho_Chi_Minh' },
  { name:'Yangon',           country:'MM', lat: 16.8661, lon:  96.1951, tz:'Asia/Rangoon' },
  { name:'Phnom Penh',       country:'KH', lat: 11.5564, lon: 104.9282, tz:'Asia/Phnom_Penh' },
  { name:'Vientiane',        country:'LA', lat: 17.9757, lon: 102.6331, tz:'Asia/Vientiane' },
  { name:'Tel Aviv',         country:'IL', lat: 32.0853, lon:  34.7818, tz:'Asia/Jerusalem' },
  { name:'Jerusalem',        country:'IL', lat: 31.7683, lon:  35.2137, tz:'Asia/Jerusalem' },
  { name:'Beirut',           country:'LB', lat: 33.8938, lon:  35.5018, tz:'Asia/Beirut' },
  { name:'Amman',            country:'JO', lat: 31.9522, lon:  35.9330, tz:'Asia/Amman' },
  { name:'Damascus',         country:'SY', lat: 33.5138, lon:  36.2765, tz:'Asia/Damascus' },
  { name:'Kuwait City',      country:'KW', lat: 29.3759, lon:  47.9774, tz:'Asia/Kuwait' },
  { name:'Doha',             country:'QA', lat: 25.2854, lon:  51.5310, tz:'Asia/Qatar' },
  { name:'Muscat',           country:'OM', lat: 23.5880, lon:  58.3829, tz:'Asia/Muscat' },
  { name:'Tbilisi',          country:'GE', lat: 41.6938, lon:  44.8015, tz:'Asia/Tbilisi' },
  { name:'Baku',             country:'AZ', lat: 40.4093, lon:  49.8671, tz:'Asia/Baku' },
  { name:'Yerevan',          country:'AM', lat: 40.1872, lon:  44.5152, tz:'Asia/Yerevan' },
  { name:'Osaka',            country:'JP', lat: 34.6937, lon: 135.5023, tz:'Asia/Tokyo' },
  { name:'Nagoya',           country:'JP', lat: 35.1815, lon: 136.9066, tz:'Asia/Tokyo' },
  { name:'Sapporo',          country:'JP', lat: 43.0618, lon: 141.3545, tz:'Asia/Tokyo' },
  { name:'Guangzhou',        country:'CN', lat: 23.1291, lon: 113.2644, tz:'Asia/Shanghai' },
  { name:'Shenzhen',         country:'CN', lat: 22.5431, lon: 114.0579, tz:'Asia/Shanghai' },
  { name:'Wuhan',            country:'CN', lat: 30.5928, lon: 114.3055, tz:'Asia/Shanghai' },
  { name:'Chengdu',          country:'CN', lat: 30.5723, lon: 104.0665, tz:'Asia/Shanghai' },
  { name:'Chongqing',        country:'CN', lat: 29.5637, lon: 106.5517, tz:'Asia/Shanghai' },
  { name:'Tianjin',          country:'CN', lat: 39.3434, lon: 117.3616, tz:'Asia/Shanghai' },
  // South American cities
  { name:'Sao Paulo',        country:'BR', lat:-23.5505, lon: -46.6333, tz:'America/Sao_Paulo' },
  { name:'Rio de Janeiro',   country:'BR', lat:-22.9068, lon: -43.1729, tz:'America/Sao_Paulo' },
  { name:'Brasilia',         country:'BR', lat:-15.7942, lon: -47.8822, tz:'America/Sao_Paulo' },
  { name:'Buenos Aires',     country:'AR', lat:-34.6037, lon: -58.3816, tz:'America/Argentina/Buenos_Aires' },
  { name:'Lima',             country:'PE', lat:-12.0464, lon: -77.0428, tz:'America/Lima' },
  { name:'Bogota',           country:'CO', lat:  4.7110, lon: -74.0721, tz:'America/Bogota' },
  { name:'Medellin',         country:'CO', lat:  6.2442, lon: -75.5812, tz:'America/Bogota' },
  { name:'Santiago',         country:'CL', lat:-33.4489, lon: -70.6693, tz:'America/Santiago' },
  { name:'Caracas',          country:'VE', lat: 10.4806, lon: -66.9036, tz:'America/Caracas' },
  { name:'Quito',            country:'EC', lat: -0.1807, lon: -78.4678, tz:'America/Guayaquil' },
  { name:'Guayaquil',        country:'EC', lat: -2.1710, lon: -79.9224, tz:'America/Guayaquil' },
  { name:'La Paz',           country:'BO', lat:-16.5000, lon: -68.1193, tz:'America/La_Paz' },
  { name:'Montevideo',       country:'UY', lat:-34.9011, lon: -56.1645, tz:'America/Montevideo' },
  { name:'Asuncion',         country:'PY', lat:-25.2867, lon: -57.6470, tz:'America/Asuncion' },
  // African cities
  { name:'Cairo',            country:'EG', lat: 30.0444, lon:  31.2357, tz:'Africa/Cairo' },
  { name:'Lagos',            country:'NG', lat:  6.5244, lon:   3.3792, tz:'Africa/Lagos' },
  { name:'Nairobi',          country:'KE', lat: -1.2921, lon:  36.8219, tz:'Africa/Nairobi' },
  { name:'Johannesburg',     country:'ZA', lat:-26.2041, lon:  28.0473, tz:'Africa/Johannesburg' },
  { name:'Cape Town',        country:'ZA', lat:-33.9249, lon:  18.4241, tz:'Africa/Johannesburg' },
  { name:'Durban',           country:'ZA', lat:-29.8587, lon:  31.0218, tz:'Africa/Johannesburg' },
  { name:'Pretoria',         country:'ZA', lat:-25.7461, lon:  28.1881, tz:'Africa/Johannesburg' },
  { name:'Casablanca',       country:'MA', lat: 33.5731, lon:  -7.5898, tz:'Africa/Casablanca' },
  { name:'Addis Ababa',      country:'ET', lat:  9.1450, lon:  40.4897, tz:'Africa/Addis_Ababa' },
  { name:'Dar es Salaam',    country:'TZ', lat: -6.7924, lon:  39.2083, tz:'Africa/Dar_es_Salaam' },
  { name:'Khartoum',         country:'SD', lat: 15.5007, lon:  32.5599, tz:'Africa/Khartoum' },
  { name:'Algiers',          country:'DZ', lat: 36.7372, lon:   3.0865, tz:'Africa/Algiers' },
  { name:'Accra',            country:'GH', lat:  5.6037, lon:  -0.1870, tz:'Africa/Accra' },
  { name:'Dakar',            country:'SN', lat: 14.7167, lon: -17.4677, tz:'Africa/Dakar' },
  { name:'Tunis',            country:'TN', lat: 36.8065, lon:  10.1815, tz:'Africa/Tunis' },
  { name:'Kampala',          country:'UG', lat:  0.3476, lon:  32.5825, tz:'Africa/Kampala' },
  { name:'Lusaka',           country:'ZM', lat:-15.4166, lon:  28.2833, tz:'Africa/Lusaka' },
  { name:'Harare',           country:'ZW', lat:-17.8252, lon:  31.0335, tz:'Africa/Harare' },
  { name:'Maputo',           country:'MZ', lat:-25.9692, lon:  32.5732, tz:'Africa/Maputo' },
  { name:'Tripoli',          country:'LY', lat: 32.8872, lon:  13.1913, tz:'Africa/Tripoli' },
  { name:'Luanda',           country:'AO', lat: -8.8390, lon:  13.2894, tz:'Africa/Luanda' },
  { name:'Abidjan',          country:'CI', lat:  5.3599, lon:  -4.0082, tz:'Africa/Abidjan' },
  // Australian & Oceanian cities
  { name:'Sydney',           country:'AU', lat:-33.8688, lon: 151.2093, tz:'Australia/Sydney' },
  { name:'Melbourne',        country:'AU', lat:-37.8136, lon: 144.9631, tz:'Australia/Melbourne' },
  { name:'Brisbane',         country:'AU', lat:-27.4698, lon: 153.0251, tz:'Australia/Brisbane' },
  { name:'Perth',            country:'AU', lat:-31.9505, lon: 115.8605, tz:'Australia/Perth' },
  { name:'Adelaide',         country:'AU', lat:-34.9285, lon: 138.6007, tz:'Australia/Adelaide' },
  { name:'Auckland',         country:'NZ', lat:-36.8485, lon: 174.7633, tz:'Pacific/Auckland' },
  { name:'Wellington',       country:'NZ', lat:-41.2865, lon: 174.7762, tz:'Pacific/Auckland' },
  // North & Central America
  { name:'Toronto',          country:'CA', lat: 43.6532, lon: -79.3832, tz:'America/Toronto' },
  { name:'Montreal',         country:'CA', lat: 45.5017, lon: -73.5673, tz:'America/Montreal' },
  { name:'Vancouver',        country:'CA', lat: 49.2827, lon:-123.1207, tz:'America/Vancouver' },
  { name:'Calgary',          country:'CA', lat: 51.0447, lon:-114.0719, tz:'America/Edmonton' },
  { name:'Ottawa',           country:'CA', lat: 45.4215, lon: -75.6972, tz:'America/Toronto' },
  { name:'Mexico City',      country:'MX', lat: 19.4326, lon: -99.1332, tz:'America/Mexico_City' },
  { name:'Guadalajara',      country:'MX', lat: 20.6597, lon:-103.3496, tz:'America/Mexico_City' },
  { name:'Monterrey',        country:'MX', lat: 25.6866, lon:-100.3161, tz:'America/Monterrey' },
  { name:'Havana',           country:'CU', lat: 23.1136, lon: -82.3666, tz:'America/Havana' },
  { name:'San Juan',         country:'PR', lat: 18.4655, lon: -66.1057, tz:'America/Puerto_Rico' },
  { name:'Guatemala City',   country:'GT', lat: 14.6349, lon: -90.5069, tz:'America/Guatemala' },
  { name:'Panama City',      country:'PA', lat:  8.9936, lon: -79.5197, tz:'America/Panama' },
  { name:'San Jose',         country:'CR', lat:  9.9281, lon: -84.0907, tz:'America/Costa_Rica' },
  { name:'Tegucigalpa',      country:'HN', lat: 14.0818, lon: -87.2068, tz:'America/Tegucigalpa' },
  { name:'Managua',          country:'NI', lat: 12.1149, lon: -86.2362, tz:'America/Managua' },
  { name:'San Salvador',     country:'SV', lat: 13.6929, lon: -89.2182, tz:'America/El_Salvador' },
  // Additional Russian/CIS cities
  { name:'St Petersburg',    country:'RU', lat: 59.9343, lon:  30.3351, tz:'Europe/Moscow' },
  { name:'Novosibirsk',      country:'RU', lat: 55.0084, lon:  82.9357, tz:'Asia/Novosibirsk' },
  { name:'Ekaterinburg',     country:'RU', lat: 56.8389, lon:  60.6057, tz:'Asia/Yekaterinburg' },
  { name:'Minsk',            country:'BY', lat: 53.9045, lon:  27.5615, tz:'Europe/Minsk' },
  { name:'Nur-Sultan',       country:'KZ', lat: 51.1801, lon:  71.4460, tz:'Asia/Almaty' },
  // Additional Middle East / North Africa
  { name:'Sanaa',            country:'YE', lat: 15.3694, lon:  44.1910, tz:'Asia/Aden' },
  { name:'Naypyidaw',        country:'MM', lat: 19.7633, lon:  96.0785, tz:'Asia/Rangoon' },
  { name:'Suva',             country:'FJ', lat:-18.1416, lon: 178.4419, tz:'Pacific/Fiji' },
];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

window.AstroEphemeris = {
  julianDay,
  obliquityOfEcliptic,
  greenwichSiderealTime,
  localSiderealTime,
  sunPosition,
  moonPosition,
  ascendant,
  midheaven,
  placidusHouses,
  houseCusps,
  planetLongitude,
  calculateAspects,
  isRetrograde,
  calculateNatalChart,
  CITIES,
  // Helpers
  mod360,
  toRad,
  toDeg,
  signOf,
  signName: signOf,
  degreeInSign,
  lunarNode,
  chironPosition,
  SIGNS,
  ELEMENTS,
  MODALITIES,
  SIGN_RULERS,
  ASPECT_DEFS,
  DAILY_MOTION,
};

// ---------------------------------------------------------------------------
// 16. moonPosition — 60-term truncated ELP2000  (Meeus Ch 47)
//     Replaces the earlier implementation; returns {lon, lat, distance}
//     where distance is in km.  moonDistance(jd) is a convenience wrapper.
// ---------------------------------------------------------------------------

function moonPosition(jd) {
  const T  = (jd - 2451545.0) / 36525;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // Fundamental arguments (degrees) — Meeus (47.1)
  const Lp = mod360(218.3164477 + 481267.88123421*T - 0.0015786*T2 + T3/538841    - T4/65194000);
  const D  = mod360(297.8501921 + 445267.1114034 *T - 0.0018819*T2 + T3/545868    - T4/113065000);
  const M  = mod360(357.5291092 +  35999.0502909 *T - 0.0001536*T2 + T3/24490000);
  const Mp = mod360(134.9633964 + 477198.8675055 *T + 0.0087414*T2 + T3/69699     - T4/14712000);
  const F  = mod360( 93.2720950 + 483202.0175233 *T - 0.0036539*T2 - T3/3526000   + T4/863310000);

  // Venus and Jupiter perturbation arguments (degrees)
  const A1 = mod360(119.75 +    131.849 * T);
  const A2 = mod360( 53.09 + 479264.290 * T);
  const A3 = mod360(313.45 + 481266.484 * T);

  // Eccentricity correction for terms involving M (sun mean anomaly)
  const E  = 1 - 0.002516*T - 0.0000074*T2;
  const E2 = E * E;

  // Pre-convert fundamental arguments to radians for the summation loops
  const Dr  = toRad(D);
  const Mr  = toRad(M);
  const Mpr = toRad(Mp);
  const Fr  = toRad(F);

  // Table 47.A — 60 largest periodic terms for longitude (Σl, ×10⁻⁶ °)
  //              and distance            (Σr, ×10⁻³ km)
  // Columns: [nD, nM, nMp, nF, coeff_l, coeff_r]
  const lunarLR = [
    [ 0, 0, 1, 0,  6288774, -20905355],
    [ 2, 0,-1, 0,  1274027,  -3699111],
    [ 2, 0, 0, 0,   658314,  -2955968],
    [ 0, 0, 2, 0,   213618,   -569925],
    [ 0, 1, 0, 0,  -185116,     48888],
    [ 0, 0, 0, 2,  -114332,     -3149],
    [ 2, 0,-2, 0,    58793,    246158],
    [ 2,-1,-1, 0,    57066,   -152138],
    [ 2, 0, 1, 0,    53322,   -170733],
    [ 2,-1, 0, 0,    45758,   -204586],
    [ 0, 1,-1, 0,   -40923,   -129620],
    [ 1, 0, 0, 0,   -34720,    108743],
    [ 0, 1, 1, 0,   -30383,    104755],
    [ 2, 0, 0,-2,    15327,     10321],
    [ 0, 0, 1, 2,   -12528,         0],
    [ 0, 0, 1,-2,    10980,     79661],
    [ 4, 0,-1, 0,    10675,    -34782],
    [ 0, 0, 3, 0,    10034,    -23210],
    [ 4, 0,-2, 0,     8548,    -21636],
    [ 2, 1,-1, 0,    -7888,     24208],
    [ 2, 1, 0, 0,    -6766,     30824],
    [ 1, 0,-1, 0,    -5163,     -8379],
    [ 1, 1, 0, 0,     4987,    -16675],
    [ 2,-1, 1, 0,     4036,    -12831],
    [ 2, 0, 2, 0,     3994,    -10445],
    [ 4, 0, 0, 0,     3861,    -11650],
    [ 2, 0,-3, 0,     3665,     14403],
    [ 0, 1,-2, 0,    -2689,     -7003],
    [ 2, 0,-1, 2,    -2602,         0],
    [ 2,-1,-2, 0,     2390,     10056],
    [ 1, 0, 1, 0,    -2348,      6322],
    [ 2,-2, 0, 0,     2236,     -9884],
    [ 0, 1, 2, 0,    -2120,      5751],
    [ 0, 2, 0, 0,    -2069,         0],
    [ 2,-2,-1, 0,     2048,     -4950],
    [ 2, 0, 1,-2,    -1773,      4130],
    [ 2, 0, 0, 2,    -1595,         0],
    [ 4,-1,-1, 0,     1215,     -3958],
    [ 0, 0, 2, 2,    -1110,         0],
    [ 3, 0,-1, 0,     -892,      3258],
    [ 2, 1, 1, 0,     -810,      2616],
    [ 4,-1,-2, 0,      759,     -1897],
    [ 0, 2,-1, 0,     -713,     -2117],
    [ 2, 2,-1, 0,     -700,      2354],
    [ 2, 1,-2, 0,      691,         0],
    [ 2,-1, 0,-2,      596,         0],
    [ 4, 0, 1, 0,      549,     -1423],
    [ 0, 0, 4, 0,      537,     -1117],
    [ 4,-1, 0, 0,      520,     -1571],
    [ 1, 0,-2, 0,     -487,     -1739],
    [ 2, 1, 0,-2,     -399,         0],
    [ 0, 0, 2,-2,     -381,     -4421],
    [ 1, 1, 1, 0,      351,         0],
    [ 3, 0,-2, 0,     -340,         0],
    [ 4, 0,-3, 0,      330,         0],
    [ 2,-1, 2, 0,      327,         0],
    [ 0, 2, 1, 0,     -323,      1165],
    [ 1, 1,-1, 0,      299,         0],
    [ 2, 0, 3, 0,      294,         0],
    [ 2, 0,-1,-2,        0,      8752],
  ];

  // Table 47.B — 30 largest periodic terms for latitude (Σb, ×10⁻⁶ °)
  // Columns: [nD, nM, nMp, nF, coeff_b]
  const lunarB = [
    [ 0, 0, 0, 1,  5128122],
    [ 0, 0, 1, 1,   280602],
    [ 0, 0, 1,-1,   277693],
    [ 2, 0, 0,-1,   173237],
    [ 2, 0,-1, 1,    55413],
    [ 2, 0,-1,-1,    46271],
    [ 2, 0, 0, 1,    32573],
    [ 0, 0, 2, 1,    17198],
    [ 2, 0, 1,-1,     9266],
    [ 0, 0, 2,-1,     8822],
    [ 2,-1, 0,-1,     8216],
    [ 2, 0,-2,-1,     4324],
    [ 2, 0, 1, 1,     4200],
    [ 2, 1, 0,-1,    -3359],
    [ 2,-1,-1, 1,     2463],
    [ 2,-1, 0, 1,     2211],
    [ 2,-1,-1,-1,     2065],
    [ 0, 1,-1,-1,    -1870],
    [ 4, 0,-1,-1,     1828],
    [ 0, 1, 0, 1,    -1794],
    [ 0, 0, 0, 3,    -1749],
    [ 0, 1,-1, 1,    -1565],
    [ 1, 0, 0, 1,    -1491],
    [ 0, 1, 1, 1,    -1475],
    [ 0, 1, 1,-1,    -1410],
    [ 0, 1, 0,-1,    -1344],
    [ 1, 0, 0,-1,    -1335],
    [ 0, 0, 3, 1,     1107],
    [ 4, 0, 0,-1,     1021],
    [ 4, 0,-1, 1,      833],
  ];

  let sumL = 0, sumR = 0, sumB = 0;

  for (const [nD, nM, nMp, nF, cl, cr] of lunarLR) {
    const eFactor = Math.abs(nM) === 1 ? E : Math.abs(nM) === 2 ? E2 : 1;
    const arg = nD*Dr + nM*Mr + nMp*Mpr + nF*Fr;
    sumL += eFactor * cl * Math.sin(arg);
    sumR += eFactor * cr * Math.cos(arg);
  }

  for (const [nD, nM, nMp, nF, cb] of lunarB) {
    const eFactor = Math.abs(nM) === 1 ? E : Math.abs(nM) === 2 ? E2 : 1;
    const arg = nD*Dr + nM*Mr + nMp*Mpr + nF*Fr;
    sumB += eFactor * cb * Math.sin(arg);
  }

  // Additive corrections (Meeus 47.6) — Venus, Jupiter, flat-Earth terms
  const Lpr = toRad(Lp);
  const A1r = toRad(A1);
  const A2r = toRad(A2);
  const A3r = toRad(A3);
  const Mpr2 = toRad(Mp); // already computed above but kept explicit for clarity

  sumL += 3958*Math.sin(A1r) + 1962*Math.sin(Lpr - Fr) + 318*Math.sin(A2r);
  sumB += -2235*Math.sin(Lpr) + 382*Math.sin(A3r)
        +   175*Math.sin(A1r - Fr) + 175*Math.sin(A1r + Fr)
        +   127*Math.sin(Lpr - Mpr2) - 115*Math.sin(Lpr + Mpr2);

  // Final geocentric ecliptic coordinates
  const lon      = mod360(Lp + sumL / 1e6);          // degrees
  const lat      = sumB / 1e6;                         // degrees
  const distance = 385000.56 + sumR / 1e3;             // km

  return { lon, lat, distance };
}

// ---------------------------------------------------------------------------
// moonDistance — convenience wrapper returning only the Earth–Moon distance
// ---------------------------------------------------------------------------

function moonDistance(jd) {
  return moonPosition(jd).distance;
}

// Expose new functions on the existing export object
window.AstroEphemeris.moonPosition = moonPosition;
window.AstroEphemeris.moonDistance = moonDistance;

// ---------------------------------------------------------------------------
// VSOP87 truncated series — planetary positions
// ---------------------------------------------------------------------------

// VSOP87 truncated series helper
function vsop87(terms, tau) {
    return terms.reduce((sum, [A, B, C]) => sum + A * Math.cos(B + C * tau), 0);
}

const normalizeAngle = mod360;

// Convert heliocentric to geocentric ecliptic longitude
function helioToGeo(lon_h, lat_h, r, sun_lon, sun_lat, sun_r) {
    // Rectangular heliocentric
    const x = r * Math.cos(toRad(lat_h)) * Math.cos(toRad(lon_h));
    const y = r * Math.cos(toRad(lat_h)) * Math.sin(toRad(lon_h));
    const z = r * Math.sin(toRad(lat_h));
    // Sun rectangular
    const xs = sun_r * Math.cos(toRad(sun_lat)) * Math.cos(toRad(sun_lon));
    const ys = sun_r * Math.cos(toRad(sun_lat)) * Math.sin(toRad(sun_lon));
    const zs = sun_r * Math.sin(toRad(sun_lat));
    // Geocentric
    const xg = x + xs; const yg = y + ys; const zg = z + zs;
    return {
        lon: normalizeAngle(toDeg(Math.atan2(yg, xg))),
        lat: toDeg(Math.atan2(zg, Math.sqrt(xg*xg + yg*yg))),
        distance: Math.sqrt(xg*xg + yg*yg + zg*zg)
    };
}

// ---------------------------------------------------------------------------
// Mercury
// ---------------------------------------------------------------------------
function mercuryPosition(jd) {
    const tau = (jd - 2451545.0) / 365250.0;

    const L0 = vsop87([
        [440250710, 0,          0            ],
        [ 40989415, 1.48302034, 26087.9031416],
        [  5046294, 4.47785492, 52175.8062831],
        [   855347, 1.165069,   78263.7094247],
        [   165590, 4.119877,  104351.6125663],
        [    34675, 0.35468,   130439.5157079],
        [     7213, 3.17274,   156527.4188495],
        [     6490, 0.5027,    182615.3219911],
        [     3116, 3.4914,    208703.2251327],
    ], tau);

    const L1 = vsop87([
        [2608814706223, 0,        0            ],
        [      1126008, 6.2170397, 26087.9031416],
        [       303471, 3.055655,  52175.806283 ],
        [        80538, 6.10455,   78263.70942  ],
        [        21245, 2.83532,  104351.61257  ],
        [         5592, 5.82878,  130439.51571  ],
    ], tau);

    const L2 = vsop87([
        [53050, 0, 0],
    ], tau);

    const B0 = vsop87([
        [11737528, 1.98357499, 26087.9031416],
        [ 2388077, 5.03738959, 52175.8062831],
        [ 1222840, 3.14159265,     0        ],
        [  543252, 1.79644363, 78263.7094247],
        [  129779, 4.83232503,104351.6125663],
    ], tau);

    const R0 = vsop87([
        [39528272, 0,        0            ],
        [ 7834132, 6.19233,  26087.9031416],
        [  795526, 2.95989,  52175.80628  ],
        [  121282, 6.01064,  78263.70942  ],
        [   21922, 2.77820, 104351.61257  ],
        [    4354, 5.82681, 130439.51571  ],
    ], tau);

    const R1 = vsop87([
        [217348, 4.65617, 26087.9031416],
        [ 44142, 1.42386, 52175.8062831],
        [ 10094, 4.47466, 78263.7094247],
    ], tau);

    const L   = toDeg((L0 + L1 * tau + L2 * tau * tau) / 1e8);
    const B   = toDeg(B0 / 1e8);
    const R   = (R0 + R1 * tau) / 1e8;

    const sun = sunPosition(jd);
    return helioToGeo(normalizeAngle(L), B, R, sun.lon, 0, sun.distance);
}

// ---------------------------------------------------------------------------
// Venus
// ---------------------------------------------------------------------------
function venusPosition(jd) {
    const tau = (jd - 2451545.0) / 365250.0;

    const L0 = vsop87([
        [317614667, 0,          0           ],
        [  1353968, 5.5931332,  10213.2855462],
        [    89892, 5.30650,    20426.5710924],
        [     5477, 4.4163,      7860.4193924],
        [     3456, 2.6996,     11790.6290887],
        [     2372, 2.9938,      3930.2096962],
        [     1664, 4.2502,      1577.3435424],
        [     1438, 4.1575,      9153.9038610],
        [     1317, 5.1867,        26.2983198],
    ], tau);

    const L1 = vsop87([
        [1021352943053, 0,       0           ],
        [        95708, 2.46424, 10213.28555 ],
        [        14445, 0.51625, 20426.57109 ],
        [          213, 1.795,   30639.857   ],
        [          174, 2.655,      26.298   ],
        [          152, 6.106,    1577.344   ],
    ], tau);

    const L2 = vsop87([
        [54127, 0, 0],
    ], tau);

    const B0 = vsop87([
        [5923638, 0.26702775, 10213.2855462],
        [  40108, 1.14737878, 20426.5710924],
        [  32815, 3.14159265,     0        ],
        [   1011, 1.0895,     30639.8566   ],
        [    149, 6.254,      18073.705    ],
    ], tau);

    const R0 = vsop87([
        [72334821, 0,        0           ],
        [  489824, 4.021518, 10213.285546],
        [    1658, 4.9021,   20426.5711  ],
        [    1632, 2.8455,    7860.4194  ],
        [    1378, 1.1285,   11790.6291  ],
        [     498, 5.209,     9153.904   ],
    ], tau);

    const R1 = vsop87([
        [34551, 0.89199, 10213.28555],
        [ 2365, 4.35367, 20426.57109],
    ], tau);

    const L   = toDeg((L0 + L1 * tau + L2 * tau * tau) / 1e8);
    const B   = toDeg(B0 / 1e8);
    const R   = (R0 + R1 * tau) / 1e8;

    const sun = sunPosition(jd);
    return helioToGeo(normalizeAngle(L), B, R, sun.lon, 0, sun.distance);
}

// ---------------------------------------------------------------------------
// Mars
// ---------------------------------------------------------------------------
function marsPosition(jd) {
    const tau = (jd - 2451545.0) / 365250.0;

    const L0 = vsop87([
        [620347712, 0,         0           ],
        [ 18656368, 5.05037100, 3340.6124267],
        [  1108217, 5.4009984,  6681.2248534],
        [    91798, 5.75479,   10021.8372801],
        [    27745, 5.97050,    2281.2304965],
        [    12316, 0.84956,    2810.9214624],
        [    10610, 2.93959,   13362.4497068],
        [     8927, 4.15778,    3154.6870849],
        [     8716, 6.11000,    1059.3819301],
        [     7775, 3.33882,    5621.8429232],
        [     3575, 1.66186,    2544.3144198],
        [     2488, 3.16670,   16703.0621335],
    ], tau);

    const L1 = vsop87([
        [334085627474, 0,       0           ],
        [     1458228, 3.60426, 3340.6124267],
        [      164901, 3.9984,  6681.2249   ],
        [       19963, 4.1850, 10021.8373   ],
        [        3452, 4.7321,  3154.6871   ],
        [        2485, 4.6555, 13362.4497   ],
    ], tau);

    const L2 = vsop87([
        [58016, 2.04979, 3340.61243],
        [54188, 0,       0         ],
    ], tau);

    const B0 = vsop87([
        [3197135, 3.7683204, 3340.6124267],
        [ 298033, 4.1065403, 6681.2248534],
        [ 289105, 0,            0        ],
        [  31366, 4.4465,    10021.8373  ],
        [   3484, 4.7881,    13362.4497  ],
    ], tau);

    const R0 = vsop87([
        [153033488, 0,         0           ],
        [ 14184953, 3.47971284, 3340.6124267],
        [   660776, 3.81783,    6681.22485  ],
        [    46179, 4.15595,   10021.83728  ],
        [     8109, 5.55195,    2810.92146  ],
        [     7485, 1.77239,    5621.84292  ],
        [     5765, 0.23572,    2281.23050  ],
        [     3575, 1.66186,    2544.31442  ],
        [     2484, 4.92545,    2942.46342  ],
    ], tau);

    const R1 = vsop87([
        [1107433, 2.03250, 3340.61243],
        [  103176, 2.37071, 6681.22485],
        [   12877, 0,       0         ],
    ], tau);

    const L   = toDeg((L0 + L1 * tau + L2 * tau * tau) / 1e8);
    const B   = toDeg(B0 / 1e8);
    const R   = (R0 + R1 * tau) / 1e8;

    const sun = sunPosition(jd);
    return helioToGeo(normalizeAngle(L), B, R, sun.lon, 0, sun.distance);
}

// ---------------------------------------------------------------------------
// Jupiter
// ---------------------------------------------------------------------------
function jupiterPosition(jd) {
    const tau = (jd - 2451545.0) / 365250.0;

    const L0 = vsop87([
        [59954691, 0,         0          ],
        [ 9695899, 5.0619179, 529.6909651],
        [  573610, 1.444062,    7.1135470],
        [  306389, 5.417347, 1059.3819301],
        [   97178, 4.14027,   632.7837753],
        [   72903, 3.64042,   522.5774180],
        [   64264, 3.41145,   103.0927742],
        [   39806, 2.29377,   419.4846438],
        [   38857, 1.27232,   316.3918722],
    ], tau);

    const L1 = vsop87([
        [52993480757, 0,       0          ],
        [     489741, 4.22066, 529.69097  ],
        [     228919, 6.02647,   7.11355  ],
        [      27655, 4.31147, 1059.38193 ],
        [      20721, 5.45939,  522.57742 ],
        [      12106, 0.16985,  536.80451 ],
    ], tau);

    const L2 = vsop87([
        [177352, 5.70166, 529.69097],
        [ 30699, 1.76215,   7.11355],
    ], tau);

    const B0 = vsop87([
        [2268616, 3.5585026, 529.6909651],
        [ 110090, 0,           0        ],
        [ 109922, 3.90700,  1059.38193  ],
        [   8101, 3.6051,    522.5774   ],
        [   4335, 8.291,     536.8045   ],
        [   4230, 5.6147,      7.1135   ],
    ], tau);

    const R0 = vsop87([
        [520887429, 0,         0          ],
        [ 25209327, 3.49108640, 529.6909651],
        [   610600, 3.84115,  1059.38193  ],
        [   282029, 2.57487,   632.78378  ],
        [   187647, 2.07574,   522.57742  ],
        [    86793, 0.71001,   419.48464  ],
        [    72063, 0.21466,   536.80451  ],
        [    65517, 5.97996,   316.39187  ],
        [    29134, 1.67759,   103.09277  ],
    ], tau);

    const R1 = vsop87([
        [1271802, 2.64937, 529.69097],
        [   61662, 3.00990,   7.11355],
        [   53444, 3.89718, 1059.38193],
    ], tau);

    const L   = toDeg((L0 + L1 * tau + L2 * tau * tau) / 1e8);
    const B   = toDeg(B0 / 1e8);
    const R   = (R0 + R1 * tau) / 1e8;

    const sun = sunPosition(jd);
    return helioToGeo(normalizeAngle(L), B, R, sun.lon, 0, sun.distance);
}

// ---------------------------------------------------------------------------
// Saturn
// ---------------------------------------------------------------------------
function saturnPosition(jd) {
    const tau = (jd - 2451545.0) / 365250.0;

    const L0 = vsop87([
        [87401354, 0,         0          ],
        [11107660, 3.9620509, 213.2990954],
        [ 1414151, 4.5858152,   7.1135470],
        [  398379, 0.52112,   206.1855484],
        [  350769, 3.30330,   426.5981908],
        [  206816, 0.24658,   103.0927742],
        [   79271, 3.84007,   220.4126424],
        [   23990, 4.66977,   110.2063212],
        [   16574, 0.43719,   419.4846438],
    ], tau);

    const L1 = vsop87([
        [21354295596, 0,       0          ],
        [    1296855, 1.82820, 213.2990954],
        [     564348, 2.88500,   7.11355  ],
        [     107679, 2.27699, 206.18555  ],
        [      98323, 1.08070, 426.59819  ],
        [      40255, 2.04128, 220.41264  ],
    ], tau);

    const L2 = vsop87([
        [116441, 2.92330, 213.29910],
        [ 91921, 0.07426,   7.11355],
        [ 90592, 0,         0      ],
    ], tau);

    const B0 = vsop87([
        [4330678, 3.60284428, 213.2990954],
        [ 240348, 2.8523,     426.5982   ],
        [  84746, 0,            0        ],
        [  34116, 0.57297,    206.18555  ],
        [  30863, 3.48442,    220.41264  ],
        [  14734, 2.11847,    639.89729  ],
    ], tau);

    const R0 = vsop87([
        [955758136, 0,          0          ],
        [ 52921382, 2.39226220, 213.2990954],
        [  1873680, 5.22468,    206.18555  ],
        [  1464664, 1.64762,    426.59819  ],
        [   821891, 5.93520,    316.39187  ],
        [   547507, 5.01539,    103.09277  ],
        [   371684, 2.27150,    220.41264  ],
        [   361778, 3.13904,      7.11355  ],
        [   140618, 5.70517,    632.78378  ],
    ], tau);

    const R1 = vsop87([
        [6182981, 0.25843, 213.29910],
        [ 506578, 0.71108, 206.18555],
        [ 341394, 5.79635, 426.59819],
        [  188491, 0.47200,   7.11355],
    ], tau);

    const L   = toDeg((L0 + L1 * tau + L2 * tau * tau) / 1e8);
    const B   = toDeg(B0 / 1e8);
    const R   = (R0 + R1 * tau) / 1e8;

    const sun = sunPosition(jd);
    return helioToGeo(normalizeAngle(L), B, R, sun.lon, 0, sun.distance);
}

// ---------------------------------------------------------------------------
// Uranus
// ---------------------------------------------------------------------------
function uranusPosition(jd) {
    const tau = (jd - 2451545.0) / 365250.0;

    const L0 = vsop87([
        [548129294, 0,         0          ],
        [  9260408, 0.8910642, 74.7815986 ],
        [  1504248, 3.6271926,  1.4844727 ],
        [   365982, 1.899462,  73.2970999 ],
        [   272328, 3.358237, 149.5631971 ],
        [    70328, 5.39254,   63.7358799 ],
        [    68892, 6.09292,   76.2660953 ],
        [    61951, 2.27923,    2.9689454 ],
        [    53804, 0.01452,   11.0457002 ],
    ], tau);

    const L1 = vsop87([
        [7502543122, 0,       0          ],
        [    154458, 5.24266, 74.78160   ],
        [     24456, 1.07120,  1.48447   ],
        [      9258, 0.4284,  56.6224    ],
        [      8266, 0.8560,  76.2661    ],
        [      7354, 2.5823, 149.5632    ],
    ], tau);

    const L2 = vsop87([
        [53033, 0, 0],
        [ 1479, 3.67437, 74.78160],
    ], tau);

    const B0 = vsop87([
        [1346278, 2.6187781, 74.7815986 ],
        [  62341, 5.08111,  149.5631971 ],
        [  61601, 3.14159,    0         ],
        [   9964, 1.6160,   76.2661     ],
        [   9926, 0.5763,   73.2971     ],
        [   3259, 1.2612,  224.3448     ],
    ], tau);

    const R0 = vsop87([
        [1912492952, 0,        0         ],
        [ 103858812, 3.44122,  74.78160  ],
        [  45815891, 0.14765, 149.56320  ],
        [   9385069, 5.58121,  11.04570  ],
        [   5498460, 1.97250, 130.87992  ],
        [   3791474, 6.14558,   7.11355  ],
    ], tau);

    const R1 = vsop87([
        [1479896, 3.67437, 74.78160],
        [  71212, 6.22174,149.56320],
        [  68627, 6.13411,  1.48447],
    ], tau);

    const L   = toDeg((L0 + L1 * tau + L2 * tau * tau) / 1e8);
    const B   = toDeg(B0 / 1e8);
    const R   = (R0 + R1 * tau) / 1e8;

    const sun = sunPosition(jd);
    return helioToGeo(normalizeAngle(L), B, R, sun.lon, 0, sun.distance);
}

// ---------------------------------------------------------------------------
// Neptune
// ---------------------------------------------------------------------------
function neptunePosition(jd) {
    const tau = (jd - 2451545.0) / 365250.0;

    const L0 = vsop87([
        [531188633, 0,         0          ],
        [  1798476, 2.9010127, 38.1330356 ],
        [  1019728, 0.4858092,  1.4844727 ],
        [   124532, 4.82068,   36.6485817 ],
        [    42064, 5.41055,    2.9689454 ],
        [    37715, 6.09222,   35.1641278 ],
        [    33785, 1.24488,   76.2660953 ],
        [    16483, 0.00008,  491.5579294 ],
        [     9199, 4.9375,    39.6175084 ],
    ], tau);

    const L1 = vsop87([
        [3837687717, 0,       0         ],
        [     16604, 4.86319,  1.48447  ],
        [     15807, 2.27923, 38.13304  ],
        [      3335, 3.6820,  76.2661   ],
        [      1162, 5.6319,   2.9689   ],
        [      1004, 2.4699, 491.5579   ],
    ], tau);

    const L2 = vsop87([
        [53893, 0, 0],
        [ 1455, 0.23840, 38.13304],
    ], tau);

    const B0 = vsop87([
        [3088623, 1.4410437, 38.1330356],
        [  27780, 5.91272,   76.2661   ],
        [  27624, 0,          0        ],
        [  15448, 3.50877,   39.6175   ],
        [  15355, 2.52124,   36.6486   ],
        [   1372, 0.1681,   491.5579   ],
    ], tau);

    const R0 = vsop87([
        [3007013206, 0,        0        ],
        [  27062259, 1.32999,  38.13304 ],
        [   1691764, 3.25456,  36.64858 ],
        [    807831, 5.18503,   1.48447 ],
        [    537761, 4.52289,  35.16413 ],
        [    495726, 1.57540, 491.55793 ],
    ], tau);

    const R1 = vsop87([
        [236338, 0.70498, 38.13304],
        [ 13220, 3.32015, 76.26610],
        [  8622, 6.2171,   1.48447],
    ], tau);

    const L   = toDeg((L0 + L1 * tau + L2 * tau * tau) / 1e8);
    const B   = toDeg(B0 / 1e8);
    const R   = (R0 + R1 * tau) / 1e8;

    const sun = sunPosition(jd);
    return helioToGeo(normalizeAngle(L), B, R, sun.lon, 0, sun.distance);
}

// ---------------------------------------------------------------------------
// Based on Simon et al. 1994 / Meeus Ch. 37
// ---------------------------------------------------------------------------
// Pluto via JPL Keplerian elements (Standish, "Keplerian Elements for
// Approximate Positions of the Major Planets", J2000 set valid 1800–2050).
// Pluto has no VSOP87 series; a full Keplerian orbit (with the equation of
// centre solved through Kepler) is the standard approach and is accurate to
// ~1°, vs the previous bare linear mean-longitude which carried NO equation
// of centre and was up to ~28° (a full sign) wrong for most years.
// Element[value@J2000, rate/century]: a(AU) e I(deg) L(deg) ϖ(deg) Ω(deg)
const PLUTO_ELEM = {
  a:  [39.48211675, -0.00031596],
  e:  [ 0.24882730,  0.00005170],
  I:  [17.14001206,  0.00004818],
  L:  [238.92903833, 145.20780515],
  wbar: [224.06891629, -0.04062942],
  Om: [110.30393684, -0.01183482],
};
function plutoPosition(jd) {
  const T  = (jd - 2451545.0) / 36525.0;
  const el = k => PLUTO_ELEM[k][0] + PLUTO_ELEM[k][1] * T;
  const a = el('a'), e = el('e'), I = el('I'), L = el('L'), wbar = el('wbar'), Om = el('Om');
  const w = wbar - Om;                                  // argument of perihelion
  let M = mod360(L - wbar); if (M > 180) M -= 360;      // mean anomaly, [-180,180]
  // Kepler solve (degrees), e* = e in degrees
  const eDeg = toDeg(e);
  let E = M + eDeg * Math.sin(toRad(M));
  for (let i = 0; i < 100; i++) {
    const dE = (M - (E - eDeg * Math.sin(toRad(E)))) / (1 - e * Math.cos(toRad(E)));
    E += dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  const Er = toRad(E);
  const xp = a * (Math.cos(Er) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(Er);
  // orbital plane → J2000 ecliptic
  const wr = toRad(w), Omr = toRad(Om), Ir = toRad(I);
  const cw = Math.cos(wr), sw = Math.sin(wr), cO = Math.cos(Omr), sO = Math.sin(Omr), cI = Math.cos(Ir), sI = Math.sin(Ir);
  const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  const z = (sw * sI) * xp + (cw * sI) * yp;
  const lon = mod360(toDeg(Math.atan2(y, x)));
  const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
  const r   = Math.sqrt(x * x + y * y + z * z);
  const sun = sunPosition(jd);
  return helioToGeo(lon, lat, r, sun.lon, 0, sun.distance);
}

// ---------------------------------------------------------------------------
// Convenience — all ten bodies at once
// ---------------------------------------------------------------------------
function allPlanetPositions(jd) {
    return {
        Sun:     sunPosition(jd),
        Moon:    moonPosition(jd),
        Mercury: mercuryPosition(jd),
        Venus:   venusPosition(jd),
        Mars:    marsPosition(jd),
        Jupiter: jupiterPosition(jd),
        Saturn:  saturnPosition(jd),
        Uranus:  uranusPosition(jd),
        Neptune: neptunePosition(jd),
        Pluto:   plutoPosition(jd)
    };
}

// Expose planet functions on the export object
window.AstroEphemeris.vsop87             = vsop87;
window.AstroEphemeris.helioToGeo         = helioToGeo;
window.AstroEphemeris.mercuryPosition    = mercuryPosition;
window.AstroEphemeris.venusPosition      = venusPosition;
window.AstroEphemeris.marsPosition       = marsPosition;
window.AstroEphemeris.jupiterPosition    = jupiterPosition;
window.AstroEphemeris.saturnPosition     = saturnPosition;
window.AstroEphemeris.uranusPosition     = uranusPosition;
window.AstroEphemeris.neptunePosition    = neptunePosition;
window.AstroEphemeris.plutoPosition      = plutoPosition;
window.AstroEphemeris.allPlanetPositions = allPlanetPositions;
