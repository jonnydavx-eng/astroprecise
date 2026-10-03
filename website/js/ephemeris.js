'use strict';

// =============================================================================
// Astro Precise Ephemeris Engine
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
  // Meeus Ch. 25 is a TT series. Callers pass Universal Time.
  jd = dynamicalJd(jd);
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

// Equal houses from the Ascendant — always 12 valid 30° cusps.
function equalCusps(ascDeg) {
  return Array.from({ length: 12 }, (_, i) => mod360(ascDeg + i * 30));
}

// 12 cusps that advance once around the circle with sane, distinct spans? Above the
// polar circle the quadrant arcs Placidus/Porphyry rely on collapse or invert,
// producing duplicate/zero-width houses (the duplicate cusps can be non-adjacent),
// so reject those and degrade to equal houses (standard at high latitude).
function cuspsValid(c) {
  if (!c || c.length !== 12) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const gap = mod360(c[(i + 1) % 12] - c[i]);
    if (gap < 1 || gap > 179) return false;  // zero-width or inverted span
    sum += gap;
  }
  if (Math.abs(sum - 360) > 1) return false;  // must wind exactly once (no double-cover)
  for (let i = 0; i < 12; i++)                 // belt-and-braces: all cusps distinct
    for (let j = i + 1; j < 12; j++)
      if (mod360(c[i] - c[j]) < 1 || mod360(c[j] - c[i]) < 1) return false;
  return true;
}

// Porphyry trisection, falling back to equal houses when it degenerates (polar).
function porphyryOrEqual(ascDeg, mcDeg) {
  const p = porphyryCusps(ascDeg, mcDeg);
  return cuspsValid(p) ? p : equalCusps(ascDeg);
}

// Map UI labels ("Whole Sign", prefs, profile) to engine tokens.
// Koch and other unsupported systems fall back to Placidus (documented).
function normalizeHouseSystem(system) {
  const s = String(system || 'placidus').toLowerCase().replace(/\s+/g, ' ').trim();
  if (s === 'whole' || s === 'whole sign') return 'whole';
  if (s === 'equal' || s === 'equal house') return 'equal';
  if (s === 'porphyry') return 'porphyry';
  if (s === 'placidus') return 'placidus';
  return 'placidus';
}

// House-system dispatcher. Default Placidus (Porphyry → equal-house fallback chain).
function houseCusps(system, lst, lat, eps, ascDeg, mcDeg) {
  switch (normalizeHouseSystem(system)) {
    case 'whole': {
      const s0 = Math.floor(ascDeg / 30) * 30;
      return Array.from({ length: 12 }, (_, i) => mod360(s0 + i * 30));
    }
    case 'equal':
      return equalCusps(ascDeg);
    case 'porphyry':
      return porphyryOrEqual(ascDeg, mcDeg);
    case 'placidus':
    default: {
      const pl = placidusCusps(lst, ascDeg, mcDeg, lat, eps);
      return cuspsValid(pl) ? pl : porphyryOrEqual(ascDeg, mcDeg);
    }
  }
}

// Back-compatible export: derive RAMC from the MC longitude.
function placidusHouses(mc_lon, asc_lon, lat, eps) {
  const ramc = mod360(toDeg(Math.atan2(
    Math.sin(toRad(mc_lon)) * Math.cos(toRad(eps)), Math.cos(toRad(mc_lon)))));
  const pl = placidusCusps(ramc, asc_lon, mc_lon, lat, eps);
  return cuspsValid(pl) ? pl : porphyryOrEqual(asc_lon, mc_lon);
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
  pluto: 0.0040, chiron: 0.0195, northnode: -0.053, southnode: 0.053,
  lilith: 0.111, asc: 0, mc: 0
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

// Mercury–Neptune are geocentric apparent places from VSOP87D (equinox of date).
// Pluto and Chiron are J2000 elements reduced by helioToGeo, which precesses them.

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
  if (p === 'lilith') return lilithPosition(jd).lon;
  if (p === 'northnode') return lunarNode(jd);
  if (p === 'southnode') return mod360(lunarNode(jd) + 180);
  if (_ACCURATE_FNS[p]) return _ACCURATE_FNS[p]()(jd).lon;
  throw new Error('planetLongitude: unknown body ' + planet);
}

function isRetrograde(planet, jd) {
  const p = planet.toLowerCase();
  if (p === 'sun' || p === 'moon' || p === 'northnode' || p === 'southnode' || p === 'lilith') return false;
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

// ---------------------------------------------------------------------------
// Black Moon Lilith (MEAN lunar apogee) — Meeus Ch 47 fundamental arguments.
// The mean Black Moon Lilith is the empty geometric focus of the Moon's mean
// orbital ellipse, i.e. the mean lunar apogee: 180° from the mean perigee.
// Mean perigee longitude = Lp − Mp, where Lp is the Moon's mean longitude and
// Mp its mean anomaly (both from Meeus 47.1). Apogee = perigee + 180.
// Accurate to the mean-element class (the "mean" Lilith used by virtually all
// astrology software); the oscillating/true Lilith is a different point and is
// deliberately NOT what 'lilithPosition' returns.
// ---------------------------------------------------------------------------

function lilithPosition(jd) {
  const T  = (jd - 2451545.0) / 36525;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;
  // Moon's mean longitude (Meeus 47.1)
  const Lp = 218.3164477 + 481267.88123421*T - 0.0015786*T2 + T3/538841 - T4/65194000;
  // Moon's mean anomaly (Meeus 47.1)
  const Mp = 134.9633964 + 477198.8675055*T + 0.0087414*T2 + T3/69699 - T4/14712000;
  // Mean perigee = Lp − Mp; mean apogee (Black Moon Lilith) = perigee + 180.
  const lon = mod360(Lp - Mp + 180);
  return { lon, lat: 0, sign: signOf(lon) };
}

// ---------------------------------------------------------------------------
// Lunar Node — mode 'mean' (default) or 'true'.
//   mean : Meeus mean ascending node (smooth secular motion, ~18.6 yr cycle).
//   true : the osculating ascending node, derived deterministically from the
//          real ELP2000 Moon (position + a one-second-of-arc-stable velocity
//          difference). The node is the ecliptic longitude where the Moon's
//          instantaneous orbit plane crosses the ecliptic going north. We get
//          it from the Moon's position/velocity vectors: n = r × v gives the
//          orbit-normal, and the ascending node lies 90° "behind" that normal's
//          ecliptic projection. Uses moonPosition only — no fabricated series.
// Returns { lon, sign, mode } (mode echoes which was actually computed).
// ---------------------------------------------------------------------------

function nodePosition(jd, mode) {
  mode = (mode === 'true') ? 'true' : 'mean';

  if (mode === 'mean') {
    const lon = lunarNode(jd);
    return { lon, sign: signOf(lon), mode: 'mean' };
  }

  // True (osculating) node from the real Moon's state vector.
  // Build geocentric ecliptic rectangular position at jd and jd±dt, form a
  // central-difference velocity, then the orbit normal h = r × v. The line of
  // nodes is the intersection of the orbit plane (⊥ h) with the ecliptic
  // plane (⊥ ẑ): direction = ẑ × h. Ascending node is the end of that line
  // where the Moon is climbing (v_z > 0 there).
  const dt = 0.02; // days — small enough for a good derivative, large enough
                   // to stay clear of ELP2000 truncation noise.

  function moonVec(j) {
    const m = moonPosition(j);
    const latR = toRad(m.lat), lonR = toRad(m.lon), r = m.distance;
    return [
      r * Math.cos(latR) * Math.cos(lonR),
      r * Math.cos(latR) * Math.sin(lonR),
      r * Math.sin(latR),
    ];
  }

  const rp = moonVec(jd + dt);
  const rm = moonVec(jd - dt);
  const r0 = moonVec(jd);
  const v  = [(rp[0]-rm[0])/(2*dt), (rp[1]-rm[1])/(2*dt), (rp[2]-rm[2])/(2*dt)];

  // Orbit normal h = r × v
  const hx = r0[1]*v[2] - r0[2]*v[1];
  const hy = r0[2]*v[0] - r0[0]*v[2];
  const hz = r0[0]*v[1] - r0[1]*v[0];

  // Node line direction = ẑ × h = (-hy, hx, 0); its ecliptic longitude is the
  // ascending node when the Moon crosses there moving north (hz > 0 keeps the
  // (-hy, hx) branch ascending; if hz < 0 the orbit is retrograde-normal and
  // the ascending direction flips).
  let nodeLon = mod360(toDeg(Math.atan2(hx, -hy)));
  if (hz < 0) nodeLon = mod360(nodeLon + 180);

  return { lon: nodeLon, sign: signOf(nodeLon), mode: 'true' };
}

function chironPosition(jd) {
  // Chiron (2060) — full two-body Kepler orbit from JPL osculating elements
  // (heliocentric ecliptic J2000, epoch near the 1996-02-14 perihelion):
  //   a = 13.6906 AU, e = 0.37945, i = 6.9299°, Ω = 209.29°, ω = 339.36°.
  // Replaces the old bare linear mean-longitude, which used the ASCENDING NODE
  // (209.29°) as its epoch longitude — a constant ~90–150° wrong, giving the
  // wrong zodiac sign in ~89% of years and never showing retrograde (Chiron is
  // retrograde ~5 months every year). With e = 0.38 a linear model can't work
  // anyway: true motion runs ~4x faster at perihelion than aphelion.
  // Two-body accuracy vs JPL: well under 1° for ~1970–2030, degrading to a few
  // degrees mid-century (planetary perturbations; Saturn approach ~1945 makes
  // earlier dates unreliable at the degree level).
  const a  = 13.6906, e = 0.37945;
  const inc = toRad(6.9299), Om = toRad(209.29), w = toRad(339.36);
  const TpJD = 2450127.5;                              // 1996-02-14.0 UT perihelion
  const n = 2 * Math.PI / (365.25 * Math.pow(a, 1.5)); // mean motion, rad/day
  let M = (n * (jd - TpJD)) % (2 * Math.PI);
  if (M < 0) M += 2 * Math.PI;
  // Kepler's equation via Newton–Raphson (converges in a handful of steps)
  let E = M;
  for (let k = 0; k < 60; k++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2),
                            Math.sqrt(1 - e) * Math.cos(E / 2));
  const rOrb = a * (1 - e * Math.cos(E));
  const xo = rOrb * Math.cos(nu), yo = rOrb * Math.sin(nu);
  // Orbital plane → heliocentric ecliptic J2000 (rotate by ω, i, Ω)
  const cw = Math.cos(w),  sw = Math.sin(w);
  const ci = Math.cos(inc), si = Math.sin(inc);
  const cO = Math.cos(Om), sO = Math.sin(Om);
  const x = (cO * cw - sO * sw * ci) * xo + (-cO * sw - sO * cw * ci) * yo;
  const y = (sO * cw + cO * sw * ci) * xo + (-sO * sw + cO * cw * ci) * yo;
  const z = (sw * si) * xo + (cw * si) * yo;
  const lonH = mod360(toDeg(Math.atan2(y, x)));
  const latH = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
  const rH   = Math.sqrt(x * x + y * y + z * z);
  // Heliocentric J2000 → geocentric ecliptic of date. These elements are J2000,
  // so helioToGeo's precession belongs here. VSOP87D planets are already of-date
  // and do not use this path. helioToGeo is defined later; the call is at runtime.
  const sun = sunPosition(jd);
  return helioToGeo(lonH, latH, rH, sun.lon, 0, sun.distance, jd).lon;
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

function calculateNatalChart(year, month, day, hour, minute, lat, lon, houseSystem, nodeMode) {
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
  rawPositions.lilith     = lilithPosition(jd).lon;     // mean Black Moon Lilith
  const node              = nodePosition(jd, nodeMode); // 'mean' (default) | 'true'
  rawPositions.northNode  = node.lon;
  rawPositions.southNode  = mod360(node.lon + 180);

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
    nodeMode: node.mode,   // which node model was actually used ('mean' | 'true')
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
  lilithPosition,
  nodePosition,
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
  // ELP2000 arguments are Terrestrial Time. Callers pass Universal Time.
  jd = dynamicalJd(jd);
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
// VSOP87 helper, and precession for J2000 elements (Pluto, Chiron)
// ---------------------------------------------------------------------------

// VSOP87 truncated series helper
function vsop87(terms, tau) {
    return terms.reduce((sum, [A, B, C]) => sum + A * Math.cos(B + C * tau), 0);
}

const normalizeAngle = mod360;

// Convert heliocentric to geocentric ecliptic longitude
// General precession in ecliptic longitude, J2000 → ecliptic of date (degrees).
// IAU 2006: p = 5028.796195"·T + 1.1054348"·T² (T = Julian centuries from J2000).
// Only for elements that really are J2000 (Pluto, Chiron). The VSOP87D planets
// are already on the equinox of the date; precessing them again was the growing error.
function precessionToDate(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    return (5028.796195 * T + 1.1054348 * T * T) / 3600.0;
}

function helioToGeo(lon_h, lat_h, r, sun_lon, sun_lat, sun_r, jd) {
    // Rectangular heliocentric
    const x = r * Math.cos(toRad(lat_h)) * Math.cos(toRad(lon_h));
    const y = r * Math.cos(toRad(lat_h)) * Math.sin(toRad(lon_h));
    const z = r * Math.sin(toRad(lat_h));
    // Sun rectangular
    const xs = sun_r * Math.cos(toRad(sun_lat)) * Math.cos(toRad(sun_lon));
    const ys = sun_r * Math.cos(toRad(sun_lat)) * Math.sin(toRad(sun_lon));
    const zs = sun_r * Math.sin(toRad(sun_lat));
    // Geocentric (J2000 ecliptic)
    const xg = x + xs; const yg = y + ys; const zg = z + zs;
    // Rotate J2000 → ecliptic of date so planets match the of-date Sun/Moon.
    const prec = (jd === undefined) ? 0 : precessionToDate(jd);
    return {
        lon: normalizeAngle(toDeg(Math.atan2(yg, xg)) + prec),
        lat: toDeg(Math.atan2(zg, Math.sqrt(xg*xg + yg*yg))),
        distance: Math.sqrt(xg*xg + yg*yg + zg*zg)
    };
}

// ---------------------------------------------------------------------------
// VSOP87D — Mercury through Neptune, equinox of the date
// ---------------------------------------------------------------------------
// Bretagnon & Francou VSOP87D gives heliocentric spherical coordinates on the
// dynamical ecliptic and equinox of the date. These are not J2000 coordinates.
// helioToGeo adds general precession because Pluto and Chiron are J2000
// elements. Doing that to VSOP87D counted precession twice: the longitude
// error is general precession itself, about 50.3″ per year away from J2000.
// Uranus was the same of-date series cut to a few terms, so the truncation
// sometimes cancelled the extra precession and sometimes added to it.
//
// Terms with |A| >= 5e-6 rad are kept (1007 terms, Earth included).
// Apparent geocentric longitude uses one light-time step, nutation in
// longitude, and annual aberration. Every position function takes Universal
// Time. ΔT is applied inside the theories and is not part of time-zone conversion
// or sidereal time, so the Ascendant and Midheaven stay on UT.

// ΔT = TT − UT, seconds.
// 1900–2005: Espenak & Meeus polynomials (NASA), within ~2s of Swiss Ephemeris 2.10.
// From 2005: Stephenson, Morrison & Hohenkerk 2016 cubic, which follows Swiss
// Ephemeris 2.10 / IERS through 2100. The 2004 NASA future parabola is ~100s
// high by 2100 and would leave the Moon about an arcminute behind the sky.
// Before 1900: Morrison & Stephenson long-term parabola, −20 + 32 u².
function deltaTSeconds(jd) {
  const y = 2000 + (jd - 2451545.0) / 365.25;
  if (y < 1900) {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  }
  if (y < 1920) {
    const t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t * t * t * t;
  }
  if (y < 1941) {
    const t = y - 1920;
    return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t;
  }
  if (y < 1961) {
    const t = y - 1950;
    return 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547;
  }
  if (y < 1986) {
    const t = y - 1975;
    return 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718;
  }
  if (y < 2005) {
    const t = y - 2000;
    const t2 = t * t;
    return 63.86 + 0.3345 * t - 0.060374 * t2 + 0.0017275 * t2 * t + 0.000651814 * t2 * t2 + 0.00002373599 * t2 * t2 * t;
  }
  const B = y - 2000;
  if (y < 2500) {
    return ((B * B * B) * 121) / 30000000 + (B * B) / 1250 + (B * 521) / 3000 + 64;
  }
  const u = 0.01 * B;
  return u * u * 32.5 + 42.5;
}

function dynamicalJd(jd) {
  return jd + deltaTSeconds(jd) / 86400;
}

// Nutation in longitude, degrees (Meeus Ch. 22, three largest terms).
function nutationInLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const Om = toRad(mod360(125.04452 - 1934.136261 * T));
  const Ls = toRad(mod360(280.4665 + 36000.7698 * T));
  return (-17.1996 * Math.sin(Om) - 1.3187 * Math.sin(2 * Ls) + 0.2062 * Math.sin(2 * Om)) / 3600;
}

const VSOP87D = {
  earth: {
    L: [
      [
        [1.75347045673,0.0,0.0],[0.03341656456,4.66925680417,6283.0758499914],[0.00034894275,4.62610241759,12566.1516999828],
        [3.417571e-05,2.82886579606,3.523118349],[3.497056e-05,2.74411800971,5753.3848848968],[3.135896e-05,3.62767041758,77713.7714681205],
        [2.676218e-05,4.41808351397,7860.4193924392],[2.342687e-05,6.13516237631,3930.2096962196],[1.273166e-05,2.03709655772,529.6909650946],
        [1.324292e-05,0.74246356352,11506.7697697936],[9.01855e-06,2.04505443513,26.2983197998],[1.199167e-05,1.10962944315,1577.3435424478],
        [8.57223e-06,3.50849156957,398.1490034082],[7.79786e-06,1.17882652114,5223.6939198022],[9.9025e-06,5.23268129594,5884.9268465832],
        [7.53141e-06,2.53339053818,5507.5532386674],[5.05264e-06,4.58292563052,18849.2275499742],
      ],
      [
        [6283.31966747491,0.0,0.0],[0.00206058863,2.67823455584,6283.0758499914],[4.30343e-05,2.63512650414,12566.1516999828],
      ],
      [
        [0.0005291887,0.0,0.0],[8.719837e-05,1.07209665242,6283.0758499914],
      ],
    ],
    B: [
    ],
    R: [
      [
        [1.00013988799,0.0,0.0],[0.01670699626,3.09846350771,6283.0758499914],[0.00013956023,3.0552460962,12566.1516999828],
        [3.08372e-05,5.19846674381,77713.7714681205],[1.628461e-05,1.17387749012,5753.3848848968],[1.575568e-05,2.84685245825,7860.4193924392],
        [9.24799e-06,5.45292234084,11506.7697697936],[5.42444e-06,4.56409149777,3930.2096962196],
      ],
      [
        [0.00103018608,1.10748969588,6283.0758499914],[1.721238e-05,1.06442301418,12566.1516999828],[7.02215e-06,3.14159265359,0.0],
      ],
      [
        [4.359385e-05,5.78455133738,6283.0758499914],
      ],
    ],
  },
  mercury: {
    L: [
      [
        [4.40250710144,0.0,0.0],[0.40989414976,1.48302034194,26087.9031415742],[0.05046294199,4.4778548954,52175.8062831484],
        [0.00855346843,1.16520322351,78263.70942472259],[0.00165590362,4.11969163181,104351.61256629678],[0.00034561897,0.77930765817,130439.51570787099],
        [7.583476e-05,3.7134840051,156527.41884944518],[3.55974e-05,1.51202669419,1109.3785520934],[1.726012e-05,0.35832239908,182615.3219910194],
        [1.803463e-05,4.1033317841,5661.3320491522],[1.364682e-05,4.59918318745,27197.2816936676],[1.589923e-05,2.99510417815,25028.521211385],
        [1.017332e-05,0.8803143904,31749.2351907264],[7.14182e-06,1.54144865265,24978.5245894808],[6.43759e-06,5.30266110787,21535.9496445154],
      ],
      [
        [26088.14706222746,0.0,0.0],[0.01126007832,6.21703970996,26087.9031415742],[0.00303471395,3.05565472363,52175.8062831484],
        [0.00080538452,6.10454743366,78263.70942472259],[0.00021245035,2.83531934452,104351.61256629678],[5.592094e-05,5.82675673328,130439.51570787099],
        [1.472233e-05,2.51845458395,156527.41884944518],
      ],
      [
        [0.00053049845,0.0,0.0],[0.00016903658,4.69072300649,26087.9031415742],[7.396711e-05,1.34735624669,52175.8062831484],
        [3.018297e-05,4.45643539705,78263.70942472259],[1.107419e-05,1.26226537554,104351.61256629678],
      ],
    ],
    B: [
      [
        [0.11737528962,1.98357498767,26087.9031415742],[0.02388076996,5.03738959685,52175.8062831484],[0.01222839532,3.14159265359,0.0],
        [0.0054325181,1.79644363963,78263.70942472259],[0.0012977877,4.83232503961,104351.61256629678],[0.00031866927,1.58088495667,130439.51570787099],
        [7.963301e-05,4.60972126348,156527.41884944518],[2.014189e-05,1.35324164694,182615.3219910194],[5.13953e-06,4.37835409309,208703.2251325936],
      ],
      [
        [0.00429151362,3.50169780393,26087.9031415742],[0.00146233668,3.14159265359,0.0],[0.00022675295,0.0151536688,52175.8062831484],
        [0.00010894981,0.48540174006,78263.70942472259],[6.353462e-05,3.42943919982,104351.61256629678],[2.495743e-05,0.16051210665,130439.51570787099],
        [8.59585e-06,3.18452433647,156527.41884944518],
      ],
      [
        [0.00011830934,4.79065585784,26087.9031415742],[1.913516e-05,0.0,0.0],[1.044801e-05,1.21216540536,52175.8062831484],
      ],
    ],
    R: [
      [
        [0.39528271652,0.0,0.0],[0.07834131817,6.19233722599,26087.9031415742],[0.00795525557,2.95989690096,52175.8062831484],
        [0.00121281763,6.01064153805,78263.70942472259],[0.00021921969,2.77820093975,104351.61256629678],[4.354065e-05,5.82894543257,130439.51570787099],
        [9.18228e-06,2.59650562598,156527.41884944518],
      ],
      [
        [0.00217347739,4.65617158663,26087.9031415742],[0.00044141826,1.42385543975,52175.8062831484],[0.00010094479,4.47466326316,78263.70942472259],
        [2.432804e-05,1.24226083435,104351.61256629678],[1.624367e-05,0.0,0.0],[6.03996e-06,4.29303116561,130439.51570787099],
      ],
      [
        [3.117867e-05,3.08231840296,26087.9031415742],[1.245396e-05,6.15183317423,52175.8062831484],
      ],
    ],
  },
  venus: {
    L: [
      [
        [3.17614666774,0.0,0.0],[0.01353968419,5.59313319619,10213.285546211],[0.00089891645,5.30650048468,20426.571092422],
        [5.477201e-05,4.41630652531,7860.4193924392],[3.455732e-05,2.69964470778,11790.6290886588],[2.372061e-05,2.99377539568,3930.2096962196],
        [1.317108e-05,5.18668219093,26.2983197998],[1.664069e-05,4.2501893503,1577.3435424478],[1.438322e-05,4.15745043958,9683.5945811164],
        [1.200521e-05,6.15357115319,30639.856638633],[7.6138e-06,1.9501470212,529.6909650946],[7.07676e-06,1.06466707214,775.522611324],
        [5.84836e-06,3.99839884762,191.4482661116],[7.69314e-06,0.81629615911,9437.762934887],
      ],
      [
        [10213.52943052898,0.0,0.0],[0.00095707712,2.46424448979,10213.285546211],[0.00014444977,0.51624564679,20426.571092422],
      ],
      [
        [0.00054127076,0.0,0.0],[3.89146e-05,0.34514360047,10213.285546211],[1.33788e-05,2.02011286082,20426.571092422],
      ],
    ],
    B: [
      [
        [0.05923638472,0.26702775813,10213.285546211],[0.00040107978,1.14737178106,20426.571092422],[0.00032814918,3.14159265359,0.0],
        [1.011392e-05,1.08946123021,30639.856638633],
      ],
      [
        [0.00513347602,1.80364310797,10213.285546211],[4.3801e-05,3.38615711591,20426.571092422],
      ],
      [
        [0.00022377665,3.38509143877,10213.285546211],
      ],
      [
        [6.46671e-06,4.99166565277,10213.285546211],
      ],
    ],
    R: [
      [
        [0.72334820905,0.0,0.0],[0.00489824185,4.02151832268,10213.285546211],[1.658058e-05,4.90206728012,20426.571092422],
        [1.632093e-05,2.84548851892,7860.4193924392],[1.378048e-05,1.128465906,11790.6290886588],
      ],
      [
        [0.00034551039,0.89198710598,10213.285546211],
      ],
      [
        [1.406587e-05,5.0636639519,10213.285546211],
      ],
    ],
  },
  mars: {
    L: [
      [
        [6.20347711583,0.0,0.0],[0.186563681,5.05037100303,3340.6124266998],[0.01108216792,5.40099836958,6681.2248533996],
        [0.00091798394,5.75478745111,10021.8372800994],[0.00027744987,5.97049512942,3.523118349],[0.0001061023,2.93958524973,2281.2304965106],
        [0.00012315897,0.84956081238,2810.9214616052],[8.926772e-05,4.15697845939,0.0172536522],[8.715688e-05,6.11005159792,13362.4497067992],
        [6.797552e-05,0.36462243626,398.1490034082],[7.774867e-05,3.33968655074,5621.8429232104],[3.575079e-05,1.66186540141,2544.3144198834],
        [4.161101e-05,0.2281497533,2942.4634232916],[3.07525e-05,0.85696597082,191.4482661116],[2.628122e-05,0.6480614357,3337.0893083508],
        [2.937543e-05,6.07893711408,0.0673103028],[2.38942e-05,5.03896401349,796.2980068164],[2.579842e-05,0.02996706197,3344.1355450488],
        [1.52814e-05,1.14979306228,6151.533888305],[1.798808e-05,0.65634026844,529.6909650946],[1.264356e-05,3.62275092231,5092.1519581158],
        [1.286232e-05,3.06795924626,2146.1654164752],[1.546408e-05,2.91579633392,1751.539531416],[1.024907e-05,3.69334293555,8962.4553499102],
        [8.91567e-06,0.1829389909,16703.062133499],[8.5876e-06,2.40093704204,2914.0142358238],[8.32718e-06,2.46418591282,3340.5951730476],
        [8.32724e-06,4.49495753458,3340.629680352],[7.12899e-06,3.66336014788,1059.3819301892],[7.48724e-06,3.82248399468,155.4203994342],
        [7.23863e-06,0.67497565801,3738.761430108],[6.35557e-06,2.92182704275,8432.7643848156],[6.55163e-06,0.48864075176,3127.3133312618],
        [5.50472e-06,3.81001205408,0.9803210682],[5.52746e-06,4.47478863016,1748.016413067],
      ],
      [
        [3340.85627474342,0.0,0.0],[0.01458227051,3.60426053609,3340.6124266998],[0.00164901343,3.92631250962,6681.2248533996],
        [0.00019963338,4.2659406103,10021.8372800994],[3.452399e-05,4.73210386365,3.523118349],[2.48548e-05,4.61277567318,13362.4497067992],
        [8.41551e-06,4.45858256765,2281.2304965106],[5.37566e-06,5.01589727492,398.1490034082],[5.21041e-06,4.99422678175,3344.1355450488],
      ],
      [
        [0.00058015791,2.04979463279,3340.6124266998],[0.00054187645,0.0,0.0],[0.00013908426,2.45742359888,6681.2248533996],
        [2.465104e-05,2.80000020929,10021.8372800994],
      ],
      [
        [1.482423e-05,0.44434694876,3340.6124266998],[6.62095e-06,0.88469178686,6681.2248533996],
      ],
    ],
    B: [
      [
        [0.03197134986,3.76832042432,3340.6124266998],[0.00298033234,4.10616996243,6681.2248533996],[0.00289104742,0.0,0.0],
        [0.00031365538,4.44651052853,10021.8372800994],[3.4841e-05,4.78812547889,13362.4497067992],
      ],
      [
        [0.00350068845,5.36847836211,3340.6124266998],[0.0001411603,3.14159265359,0.0],[9.670755e-05,5.47877786506,6681.2248533996],
        [1.471918e-05,3.20205766795,10021.8372800994],
      ],
      [
        [0.0001672669,0.60221392419,3340.6124266998],[4.986799e-05,3.14159265359,0.0],
      ],
      [
        [6.06506e-06,1.98050633529,3340.6124266998],
      ],
    ],
    R: [
      [
        [1.53033488276,0.0,0.0],[0.14184953153,3.47971283519,3340.6124266998],[0.00660776357,3.81783442097,6681.2248533996],
        [0.00046179117,4.15595316284,10021.8372800994],[8.109738e-05,5.55958460165,2810.9214616052],[7.485315e-05,1.77238998069,5621.8429232104],
        [5.523193e-05,1.3643631888,2281.2304965106],[3.82516e-05,4.49407182408,13362.4497067992],[2.306539e-05,0.09081742493,2544.3144198834],
        [1.999399e-05,5.36059605227,3337.0893083508],[2.484385e-05,4.92545577893,2942.4634232916],[1.960198e-05,4.74249386323,3344.1355450488],
        [1.167115e-05,2.11261501155,5092.1519581158],[1.102828e-05,5.0090826416,398.1490034082],[8.99077e-06,4.40790433994,529.6909650946],
        [9.92252e-06,5.83862401067,6151.533888305],[8.07348e-06,2.10216647104,1059.3819301892],[7.9791e-06,3.44839026172,796.2980068164],
        [7.4098e-06,1.49906336892,2146.1654164752],[6.9234e-06,2.13378814785,8962.4553499102],[6.33144e-06,0.89353285018,3340.5951730476],
        [7.25583e-06,1.24516913473,8432.7643848156],[6.3314e-06,2.92430448169,3340.629680352],[5.74352e-06,0.82896196337,2914.0142358238],
        [5.26187e-06,5.38292276228,3738.761430108],[6.29976e-06,1.28738135858,1751.539531416],
      ],
      [
        [0.0110743334,2.0325052495,3340.6124266998],[0.00103175886,2.37071845682,6681.2248533996],[0.000128772,0.0,0.0],
        [0.0001081588,2.70888093803,10021.8372800994],[1.19455e-05,3.04702182503,13362.4497067992],
      ],
      [
        [0.00044242247,0.47930603943,3340.6124266998],[8.138042e-05,0.86998398093,6681.2248533996],[1.274915e-05,1.22594050809,10021.8372800994],
      ],
      [
        [1.113107e-05,5.14987350142,3340.6124266998],
      ],
    ],
  },
  jupiter: {
    L: [
      [
        [0.59954691495,0.0,0.0],[0.09695898711,5.06191793105,529.6909650946],[0.00573610145,1.44406205976,7.1135470008],
        [0.0030638918,5.41734729976,1059.3819301892],[0.0009717828,4.14264708819,632.7837393132],[0.00072903096,3.64042909255,522.5774180938],
        [0.00064263986,3.41145185203,103.0927742186],[0.00039806051,2.29376744855,419.4846438752],[0.0003885778,1.2723172486,316.3918696566],
        [0.00027964622,1.78454589485,536.8045120954],[0.00013589738,5.7748103159,1589.0728952838],[8.246362e-05,3.58227961655,206.1855484372],
        [8.768686e-05,3.63000324417,949.1756089698],[7.368057e-05,5.08101125612,735.8765135318],[6.263171e-05,0.02497643742,213.299095438],
        [6.11405e-05,4.51319531666,1162.4747044078],[4.905419e-05,1.32084631684,110.2063212194],[5.305283e-05,1.30671236848,14.2270940016],
        [5.305457e-05,4.18625053495,1052.2683831884],[4.647249e-05,4.69958109497,3.9321532631],[3.045009e-05,4.31675960318,426.598190876],
        [2.610001e-05,1.5666759485,846.0828347512],[2.028191e-05,1.06376547379,3.1813937377],[1.764768e-05,2.14148077766,1066.49547719],
        [1.722983e-05,3.88036008872,1265.5674786264],[1.920959e-05,0.97168928755,639.897286314],[1.633217e-05,3.58201089758,515.463871093],
        [1.431997e-05,4.29683690269,625.6701923124],[9.73278e-06,4.09764957065,95.9792272178],[8.84439e-06,2.43701426123,412.3710968744],
        [7.32875e-06,6.08534113239,838.9692877504],[7.31072e-06,3.80591233956,1581.959348283],[6.91928e-06,6.13368222939,2118.7638603784],
        [7.0919e-06,1.29272573658,742.9900605326],[6.14464e-06,4.10853496756,1478.8665740644],[5.81902e-06,4.53967717552,309.2783226558],
      ],
      [
        [529.93480757497,0.0,0.0],[0.00489741194,4.22066689928,529.6909650946],[0.00228918538,6.02647464016,7.1135470008],
        [0.0002765538,4.57265956824,1059.3819301892],[0.00020720943,5.45938936295,522.5774180938],[0.00012105732,0.16985765041,536.8045120954],
        [6.068051e-05,4.42419502005,103.0927742186],[5.433924e-05,3.98478382565,419.4846438752],[4.237795e-05,5.89009351271,14.2270940016],
        [2.211854e-05,5.26771446618,206.1855484372],[1.295769e-05,5.55132765087,3.1813937377],[1.745919e-05,4.92669378486,1589.0728952838],
        [1.163411e-05,0.51450895328,3.9321532631],[1.007216e-05,0.46478398551,735.8765135318],[1.173129e-05,5.8564730435,1052.2683831884],
        [8.47678e-06,5.7580585045,110.2063212194],[8.27329e-06,4.80312015734,213.299095438],[1.003574e-05,3.15040301822,426.598190876],
        [1.098735e-05,5.30704981594,515.463871093],[8.16397e-06,0.58643054886,1066.49547719],[7.25447e-06,5.51827471473,639.897286314],
        [5.67845e-06,5.98867049451,625.6701923124],
      ],
      [
        [0.00047233598,4.32148323554,7.1135470008],[0.00030629053,2.93021440216,529.6909650946],[0.0003896555,0.0,0.0],
        [3.189317e-05,1.05504615595,522.5774180938],[2.723358e-05,3.41411526638,1059.3819301892],[2.729292e-05,4.84545481351,536.8045120954],
        [1.721069e-05,4.18734385158,14.2270940016],
      ],
      [
        [6.501665e-05,2.59862880482,7.1135470008],[1.356524e-05,1.34635886411,529.6909650946],
      ],
      [
        [6.69483e-06,0.8528242109,7.1135470008],
      ],
    ],
    B: [
      [
        [0.02268615703,3.55852606718,529.6909650946],[0.00109971634,3.90809347389,1059.3819301892],[0.00110090358,0.0,0.0],
        [8.101427e-05,3.60509573368,522.5774180938],[6.043996e-05,4.25883108794,1589.0728952838],[6.437782e-05,0.30627121409,536.8045120954],
        [1.10688e-05,2.98534421928,1162.4747044078],[9.41651e-06,2.93619072405,1052.2683831884],[8.94088e-06,1.75447429921,7.1135470008],
        [7.6728e-06,2.1547359406,632.7837393132],[9.44328e-06,1.67522288396,426.598190876],[6.8422e-06,3.67808770098,213.299095438],
        [6.29223e-06,0.64343282328,1066.49547719],[8.35861e-06,5.17881973234,103.0927742186],[5.3167e-06,2.70305954352,110.2063212194],
        [5.58524e-06,0.01354830508,846.0828347512],
      ],
      [
        [0.00177351787,5.70166488486,529.6909650946],[3.230171e-05,5.7794161934,1059.3819301892],[3.081364e-05,5.47464296527,522.5774180938],
        [2.211914e-05,4.73477480209,536.8045120954],[1.694232e-05,3.14159265359,0.0],
      ],
      [
        [8.094051e-05,1.46322843658,529.6909650946],[7.42415e-06,0.95691639003,522.5774180938],[8.13244e-06,3.14159265359,0.0],
      ],
    ],
    R: [
      [
        [5.20887429471,0.0,0.0],[0.2520932702,3.49108640015,529.6909650946],[0.00610599902,3.84115365602,1059.3819301892],
        [0.00282029465,2.57419879933,632.7837393132],[0.00187647391,2.07590380082,522.5774180938],[0.00086792941,0.71001090609,419.4846438752],
        [0.00072062869,0.21465694745,536.8045120954],[0.00065517227,5.97995850843,316.3918696566],[0.0002913462,1.6775924371,103.0927742186],
        [0.00030135275,2.16132058449,949.1756089698],[0.00023453209,3.54023147303,735.8765135318],[0.0002228371,4.19362773546,1589.0728952838],
        [0.0002394734,0.27457854894,7.1135470008],[0.000130326,2.96043055741,1162.4747044078],[9.703346e-05,1.90669572402,206.1855484372],
        [0.00012749004,2.71550102862,1052.2683831884],[9.161431e-05,4.41352618935,213.299095438],[7.894539e-05,2.47907551404,426.598190876],
        [7.057978e-05,2.18184753111,1265.5674786264],[6.137755e-05,6.26417542514,846.0828347512],[5.477093e-05,5.65729325169,639.897286314],
        [3.502519e-05,0.56531297394,1066.49547719],[4.13689e-05,2.72219979684,625.6701923124],[4.170012e-05,2.01605033912,515.463871093],
        [2.499966e-05,4.55182055941,838.9692877504],[2.616955e-05,2.00993967129,1581.959348283],[1.911876e-05,0.85621927419,412.3710968744],
        [2.127644e-05,6.1275146175,742.9900605326],[1.610549e-05,3.08867789275,1368.660252845],[1.479484e-05,2.68026191372,1478.8665740644],
        [1.230708e-05,1.89042979701,323.5054166574],[1.21681e-05,1.80171561024,110.2063212194],[9.61072e-06,4.54876989805,2118.7638603784],
        [8.85708e-06,4.14785948471,533.6231183577],[7.767e-06,3.6769695469,728.762966531],[9.98579e-06,2.8720894011,309.2783226558],
        [1.014959e-05,1.38673237666,454.9093665273],[7.27162e-06,3.98824686402,1155.361157407],[6.55289e-06,2.79065604219,1685.0521225016],
        [8.21465e-06,1.59342534396,1898.3512179396],[6.20798e-06,4.82284338962,956.2891559706],[6.53981e-06,3.38150775269,1692.1656695024],
        [8.12036e-06,5.94091899141,909.8187330546],[5.6212e-06,0.08095987241,543.9180590962],[5.42221e-06,0.28360266386,525.7588118315],
        [6.14784e-06,2.27624915604,942.062061969],
      ],
      [
        [0.01271801596,2.64937511122,529.6909650946],[0.00061661771,3.00076251018,1059.3819301892],[0.00053443592,3.89717644226,522.5774180938],
        [0.00031185167,4.88276663526,536.8045120954],[0.00041390257,0.0,0.0],[0.0001184719,2.41329588176,419.4846438752],
        [9.16636e-05,4.75979408587,7.1135470008],[3.175763e-05,2.79297987071,103.0927742186],[3.203446e-05,5.21083285476,735.8765135318],
        [3.403605e-05,3.34688537997,1589.0728952838],[2.600003e-05,3.63435101622,206.1855484372],[2.412207e-05,1.46947308304,426.598190876],
        [2.806064e-05,3.7422369358,515.463871093],[2.676575e-05,4.33052878699,1052.2683831884],[2.100507e-05,3.92762682306,639.897286314],
        [1.646182e-05,5.30953510947,1066.49547719],[1.641257e-05,4.41628669824,625.6701923124],[1.049866e-05,3.16113622955,213.299095438],
        [1.024802e-05,2.55432643018,412.3710968744],[7.40996e-06,2.17094630558,1162.4747044078],[8.06404e-06,2.6775080138,632.7837393132],
        [6.76928e-06,6.2495347979,838.9692877504],[5.67076e-06,4.57655414712,742.9900605326],
      ],
      [
        [0.00079644833,1.35865896596,529.6909650946],[8.251618e-05,5.77773935444,522.5774180938],[7.029864e-05,3.27476965833,536.8045120954],
        [5.314006e-05,1.83835109712,1059.3819301892],[1.860833e-05,2.97682139367,7.1135470008],[8.36267e-06,4.19889881718,419.4846438752],
        [9.64466e-06,5.48031822015,515.463871093],
      ],
      [
        [3.519257e-05,6.05800633846,529.6909650946],[1.073239e-05,1.6732134576,536.8045120954],[9.15666e-06,1.41329676116,522.5774180938],
      ],
    ],
  },
  saturn: {
    L: [
      [
        [0.87401354029,0.0,0.0],[0.1110765978,3.96205090194,213.299095438],[0.01414150958,4.58581515873,7.1135470008],
        [0.00398379386,0.52112025957,206.1855484372],[0.00350769223,3.30329903015,426.598190876],[0.00206816296,0.24658366938,103.0927742186],
        [0.00079271288,3.8400707853,220.4126424388],[0.00023990338,4.6697693486,110.2063212194],[0.00016573583,0.43719123541,419.4846438752],
        [0.00014906995,5.76903283845,316.3918696566],[0.000158203,0.9380895376,632.7837393132],[0.00014609562,1.56518573691,3.9321532631],
        [0.00013160308,4.44891180176,14.2270940016],[0.00015053509,2.71670027883,639.897286314],[0.00013005305,5.98119067061,11.0457002639],
        [0.00010725066,3.12939596466,202.2533951741],[5.863207e-05,0.23657028777,529.6909650946],[5.227771e-05,4.2078316238,3.1813937377],
        [6.126308e-05,1.76328499656,277.0349937414],[5.019658e-05,3.17787919533,433.7117378768],[4.592541e-05,0.61976424374,199.0720014364],
        [4.005862e-05,2.24479893937,63.7358983034],[2.953815e-05,0.98280385206,95.9792272178],[3.873696e-05,3.22282692566,138.5174968707],
        [2.461172e-05,2.03163631205,735.8765135318],[3.26949e-05,0.77491895787,949.1756089698],[1.758143e-05,3.26580514774,522.5774180938],
        [1.640183e-05,5.50504966218,846.0828347512],[1.391336e-05,4.02331978116,323.5054166574],[1.580641e-05,4.3726631412,309.2783226558],
        [1.123515e-05,2.83726793572,415.5524906121],[1.017258e-05,3.71698151814,227.5261894396],[8.48643e-06,3.19149825839,209.3669421749],
        [1.087237e-05,4.18343232481,2.4476805548],[9.56752e-06,0.50740889886,1265.5674786264],[7.89205e-06,5.00745123149,0.9632078465],
        [6.86965e-06,1.74714407827,1052.2683831884],[6.5447e-06,1.59889331515,0.0481841098],[7.48811e-06,2.14398149298,853.196381752],
        [6.3398e-06,2.29889903023,412.3710968744],[7.43584e-06,5.25276954625,224.3447957019],[8.52677e-06,3.42141350697,175.1660598002],
        [5.79857e-06,3.09259007048,74.7815985673],[6.24904e-06,0.97046831256,210.1177017003],[5.29861e-06,4.44938897119,117.3198682202],
        [5.42643e-06,1.51824320514,9.5612275556],[5.46358e-06,2.12678554211,350.3321196004],
      ],
      [
        [213.54295595986,0.0,0.0],[0.01296855005,1.82820544701,213.299095438],[0.00564347566,2.88500136429,7.1135470008],
        [0.0009832303,1.08070061328,426.598190876],[0.0010767877,2.27769911872,206.1855484372],[0.00040254586,2.0412825709,220.4126424388],
        [0.00019941734,1.27954662736,103.0927742186],[0.00010511706,2.748803928,14.2270940016],[6.939233e-05,0.40493079985,639.897286314],
        [4.803325e-05,2.44194097666,419.4846438752],[4.056325e-05,2.92166618776,110.2063212194],[3.76863e-05,3.6496563146,3.9321532631],
        [3.384684e-05,2.41694251653,3.1813937377],[3.3022e-05,1.26256486715,433.7117378768],[3.071382e-05,2.3273931775,199.0720014364],
        [1.953036e-05,3.563946833,11.0457002639],[1.249348e-05,2.62803737519,95.9792272178],[9.21683e-06,1.9608983425,227.5261894396],
        [7.05587e-06,4.4168924933,529.6909650946],[6.49654e-06,6.17418093659,202.2533951741],[6.27603e-06,6.11088227167,309.2783226558],
      ],
      [
        [0.00116441181,1.17987850633,7.1135470008],[0.00091920844,0.07425261094,213.299095438],[0.00090592251,0.0,0.0],
        [0.00015276909,4.06492007503,206.1855484372],[0.00010631396,0.25778277414,220.4126424388],[0.00010604979,5.40963595885,426.598190876],
        [4.265368e-05,1.0459555663,14.2270940016],[1.215527e-05,2.91860042123,103.0927742186],[1.164684e-05,4.60942128971,639.897286314],
        [1.081967e-05,5.6913035167,433.7117378768],[1.020079e-05,0.63369182642,3.1813937377],[1.044754e-05,4.04206453611,199.0720014364],
        [6.33582e-06,4.38825410036,419.4846438752],[5.49329e-06,5.57303134242,3.9321532631],
      ],
      [
        [0.00016038734,5.73945377424,7.1135470008],[4.249793e-05,4.58539675603,213.299095438],[1.906524e-05,4.76082050205,220.4126424388],
        [1.465687e-05,5.91326678323,206.1855484372],[1.162041e-05,5.61973132428,14.2270940016],[1.066581e-05,3.60816533142,426.598190876],
      ],
      [
        [1.661894e-05,3.99826248978,7.1135470008],
      ],
    ],
    B: [
      [
        [0.0433067804,3.60284428399,213.299095438],[0.00240348303,2.8523848939,426.598190876],[0.00084745939,0.0,0.0],
        [0.00030863357,3.48441504465,220.4126424388],[0.00034116063,0.57297307844,206.1855484372],[0.0001473407,2.1184659787,639.897286314],
        [9.916668e-05,5.79003189405,419.4846438752],[6.993564e-05,4.73604689179,7.1135470008],[4.807587e-05,5.43305315602,316.3918696566],
        [4.788392e-05,4.9651292742,110.2063212194],[3.432125e-05,2.73255752123,433.7117378768],[1.506129e-05,6.01304536144,103.0927742186],
        [1.060298e-05,5.63099292414,529.6909650946],[9.69071e-06,5.20434966103,632.7837393132],[9.4205e-06,1.39646678088,853.196381752],
        [7.07645e-06,3.80302329547,323.5054166574],[5.52313e-06,5.13149109045,202.2533951741],
      ],
      [
        [0.00397554998,5.33289992556,213.299095438],[0.00049478641,3.14159265359,0.0],[0.00018571607,6.09919206378,426.598190876],
        [0.00014800587,2.3058606052,206.1855484372],[9.643981e-05,1.6967466012,220.4126424388],[3.757161e-05,1.25429514018,419.4846438752],
        [2.716647e-05,5.91166664787,639.897286314],[1.455309e-05,0.85161616532,433.7117378768],[1.290595e-05,2.9177085709,7.1135470008],
        [8.5263e-06,0.43572078997,316.3918696566],
      ],
      [
        [0.00020629977,0.50482422817,213.299095438],[3.719555e-05,3.99833475829,206.1855484372],[1.627158e-05,6.181899395,220.4126424388],
        [1.346067e-05,0.0,0.0],[7.05842e-06,3.03914308836,419.4846438752],
      ],
      [
        [6.66252e-06,1.99006340181,213.299095438],[6.3235e-06,5.69778316807,206.1855484372],
      ],
    ],
    R: [
      [
        [9.55758135801,0.0,0.0],[0.52921382465,2.39226219733,213.299095438],[0.01873679934,5.23549605091,206.1855484372],
        [0.01464663959,1.64763045468,426.598190876],[0.00821891059,5.93520025371,316.3918696566],[0.00547506899,5.01532628454,103.0927742186],
        [0.00371684449,2.27114833428,220.4126424388],[0.00361778433,3.13904303264,7.1135470008],[0.00140617548,5.70406652991,632.7837393132],
        [0.00108974737,3.29313595577,110.2063212194],[0.00069007015,5.94099622447,419.4846438752],[0.0006105335,0.94037761156,639.897286314],
        [0.00048913044,1.55733388472,202.2533951741],[0.00034143794,0.19518550682,277.0349937414],[0.00032401718,5.47084606947,949.1756089698],
        [0.00020936573,0.46349163993,735.8765135318],[0.00020839118,1.5210259064,433.7117378768],[0.00020746678,5.33255667599,199.0720014364],
        [0.00015298457,3.05943652881,529.6909650946],[0.00014296479,2.60433537909,323.5054166574],[0.00011993314,5.98051421881,846.0828347512],
        [0.00011380261,1.73105746566,522.5774180938],[0.00012884128,1.64892310393,138.5174968707],[7.752769e-05,5.85191318903,95.9792272178],
        [9.796061e-05,5.20475863996,1265.5674786264],[6.465967e-05,0.17733160145,1052.2683831884],[6.770621e-05,3.00433479284,14.2270940016],
        [5.850443e-05,1.45519636076,415.5524906121],[5.307481e-05,0.5973753405,63.7358983034],[4.695746e-05,2.14919036956,227.5261894396],
        [4.043988e-05,1.64010323863,209.3669421749],[3.688132e-05,0.7801613317,412.3710968744],[3.376457e-05,3.69528478828,224.3447957019],
        [2.885348e-05,1.38764077631,838.9692877504],[2.976033e-05,5.68467931117,210.1177017003],[3.419551e-05,4.94549148887,1581.959348283],
        [3.460943e-05,1.85088802878,175.1660598002],[3.400616e-05,0.55386747515,350.3321196004],[2.50763e-05,3.53851863255,742.9900605326],
        [2.448325e-05,6.18412386316,1368.660252845],[2.406138e-05,2.96559220267,117.3198682202],[2.881181e-05,0.17960757891,853.196381752],
        [2.173959e-05,0.01508587396,340.7708920448],[2.024483e-05,5.05411271271,11.0457002639],[1.740254e-05,2.34657043464,309.2783226558],
        [1.861397e-05,5.93361638244,625.6701923124],[1.888436e-05,0.02968443389,3.9321532631],[1.610859e-05,1.17302463549,74.7815985673],
        [1.462631e-05,1.92588134017,216.4804891757],[1.474547e-05,5.6767046113,203.7378678824],[1.395109e-05,5.93669404929,127.4717966068],
        [1.781165e-05,0.76314388077,217.2312487011],[1.817186e-05,5.77713225779,490.3340891794],[1.472392e-05,1.40064915651,137.0330241624],
        [1.304089e-05,0.77235613966,647.0108333148],[1.149773e-05,5.74021249703,1162.4747044078],[1.126667e-05,4.46707803791,265.9892934775],
        [1.277489e-05,2.98412586423,1059.3819301892],[1.207053e-05,0.7528593316,351.8165923087],[1.071399e-05,1.13567265104,1155.361157407],
        [1.020922e-05,5.91233512844,1685.0521225016],[1.315042e-05,5.11202572637,211.8146227297],[1.295553e-05,4.69184139933,1898.3512179396],
        [1.099037e-05,1.81765118601,149.5631971346],[9.98462e-06,2.63131596867,200.7689224658],[9.85869e-06,2.25992849742,956.2891559706],
        [9.32434e-06,3.66980793184,554.0699874828],[6.64481e-06,0.60297724821,728.762966531],[6.5985e-06,4.66635439533,195.1398481733],
        [6.1774e-06,5.62092000007,942.062061969],[6.26382e-06,5.9420823259,1478.8665740644],[5.53128e-06,3.41088600844,269.9214467406],
        [5.34397e-06,1.26443331367,275.5505210331],[5.17196e-06,4.44310450526,2214.7430875962],
      ],
      [
        [0.06182981282,0.25843515034,213.299095438],[0.00506577574,0.71114650941,206.1855484372],[0.00341394136,5.7963577396,426.598190876],
        [0.00188491375,0.47215719444,220.4126424388],[0.0018626154,3.14159265359,0.0],[0.00143891176,1.40744864239,7.1135470008],
        [0.00049621111,6.0174446958,103.0927742186],[0.00020928189,5.0924565447,639.897286314],[0.00019952612,1.17560125007,419.4846438752],
        [0.00018839639,1.60819563173,110.2063212194],[0.00012892827,5.94330258435,433.7117378768],[0.00013876565,0.75886204364,199.0720014364],
        [5.396699e-05,1.28852405908,14.2270940016],[4.869308e-05,0.86793894213,323.5054166574],[4.247455e-05,0.39299384543,227.5261894396],
        [3.252084e-05,1.25853470491,95.9792272178],[2.856006e-05,2.16731405366,735.8765135318],[2.909411e-05,4.60679154788,202.2533951741],
        [3.081408e-05,3.43662557418,522.5774180938],[1.987689e-05,2.45054204795,412.3710968744],[1.941309e-05,6.02393385142,209.3669421749],
        [1.581446e-05,1.29191789712,210.1177017003],[1.339511e-05,4.30801821806,853.196381752],[1.31559e-05,1.25296446023,117.3198682202],
        [1.203085e-05,1.86654673794,316.3918696566],[1.091088e-05,0.07527246854,216.4804891757],[9.54403e-06,5.15173410519,647.0108333148],
        [9.66012e-06,0.47991379141,632.7837393132],[8.81827e-06,1.88471724478,1052.2683831884],[8.74215e-06,1.40224683864,224.3447957019],
        [8.97512e-06,0.98343776092,529.6909650946],[7.84866e-06,3.06377517461,838.9692877504],[7.39892e-06,1.38225356694,625.6701923124],
        [6.12961e-06,3.03307306767,63.7358983034],[6.5821e-06,4.1436293098,309.2783226558],[6.496e-06,1.7248948616,742.9900605326],
        [5.99236e-06,2.54924174765,217.2312487011],[5.02886e-06,2.12958819475,3.9321532631],
      ],
      [
        [0.00436902464,4.78671673044,213.299095438],[0.0007192276,2.50069994874,206.1855484372],[0.00049766792,4.9716815087,220.4126424388],
        [0.00043220894,3.86940443794,426.598190876],[0.00029645554,5.96310264282,7.1135470008],[4.14165e-05,4.10670940823,433.7117378768],
        [4.720909e-05,2.47527992423,199.0720014364],[3.78937e-05,3.09771025067,639.897286314],[2.96399e-05,1.37206248846,103.0927742186],
        [2.556363e-05,2.85065721526,419.4846438752],[2.208457e-05,6.27588858707,110.2063212194],[2.187621e-05,5.85545832218,14.2270940016],
        [1.956896e-05,4.92448618045,227.5261894396],[2.326801e-05,0.0,0.0],[9.2384e-06,5.46392422737,323.5054166574],
        [7.05936e-06,2.97081280098,95.9792272178],[5.46115e-06,4.12854181522,412.3710968744],
      ],
      [
        [0.00020315005,3.02186626038,213.299095438],[8.923581e-05,3.19144205755,220.4126424388],[6.908677e-05,4.35174889353,206.1855484372],
        [4.087129e-05,4.22406927376,7.1135470008],[3.879041e-05,2.01056445995,426.598190876],[1.070788e-05,4.20360341236,199.0720014364],
        [9.07332e-06,2.28344368029,433.7117378768],[6.06121e-06,3.17458570534,227.5261894396],[5.96639e-06,4.13455753351,14.2270940016],
      ],
      [
        [1.20205e-05,1.41499446465,220.4126424388],[7.07796e-06,1.16153570102,213.299095438],[5.16121e-06,6.2397356833,206.1855484372],
      ],
    ],
  },
  uranus: {
    L: [
      [
        [5.48129294299,0.0,0.0],[0.09260408252,0.8910642153,74.7815985673],[0.01504247826,3.62719262195,1.4844727083],
        [0.00365981718,1.89962189068,73.297125859],[0.00272328132,3.35823710524,149.5631971346],[0.00070328499,5.39254431993,63.7358983034],
        [0.00068892609,6.09292489045,76.2660712756],[0.00061998592,2.26952040469,2.9689454166],[0.00061950714,2.85098907565,11.0457002639],
        [0.00026468869,3.14152087888,71.8126531507],[0.00025710505,6.11379842935,454.9093665273],[0.00021078897,4.36059465144,148.0787244263],
        [0.00017818665,1.74436982544,36.6485629295],[0.00014613471,4.73732047977,3.9321532631],[0.00011162535,5.82681993692,224.3447957019],
        [0.00010997934,0.48865493179,138.5174968707],[9.527487e-05,2.95516893093,35.1640902212],[7.545543e-05,5.23626440666,109.9456887885],
        [4.22017e-05,3.23328535514,70.8494453042],[4.05185e-05,2.27754158724,151.0476698429],[3.354607e-05,1.06549008887,4.4534181249],
        [2.926671e-05,4.62903695486,9.5612275556],[3.490352e-05,5.48305567292,146.594251718],[3.144093e-05,4.75199307603,77.7505439839],
        [2.92241e-05,5.3523674338,85.8272988312],[2.27279e-05,4.36600802756,70.3281804424],[2.051209e-05,1.51773563459,0.1118745846],
        [2.148599e-05,0.60745800902,38.1330356378],[1.991726e-05,4.92437290826,277.0349937414],[1.376208e-05,2.04281409054,65.2203710117],
        [1.66691e-05,3.62744580852,380.12776796],[1.284183e-05,3.11346336879,202.2533951741],[1.150416e-05,0.93344454002,3.1813937377],
        [1.533223e-05,2.58593414266,52.6901980395],[1.281641e-05,0.54269869505,222.8603229936],[1.3721e-05,4.19641615561,111.4301614968],
        [1.220998e-05,0.19901396193,108.4612160802],[9.46195e-06,1.19249463066,127.4717966068],[1.150993e-05,4.17898207045,33.6796175129],
        [1.244342e-05,0.91612680579,2.4476805548],[1.072008e-05,0.23564502877,62.2514255951],[1.090461e-05,1.77501638912,12.5301729722],
        [7.07875e-06,5.18285226584,213.299095438],[6.53401e-06,0.96586909116,78.7137518304],[6.27562e-06,0.18210181975,984.6003316219],
        [5.24495e-06,2.01276706996,299.1263942692],[5.5937e-06,3.35776737704,0.5212648618],[6.06827e-06,5.43209728952,529.6909650946],
      ],
      [
        [75.02543121646,0.0,0.0],[0.00154458244,5.24201658072,74.7815985673],[0.00024456413,1.71255705309,1.4844727083],
        [9.257828e-05,0.42844639064,11.0457002639],[8.265977e-05,1.5022003511,63.7358983034],[7.841715e-05,1.31983607251,149.5631971346],
        [3.899105e-05,0.46483574024,3.9321532631],[2.283777e-05,4.17367533997,76.2660712756],[1.9266e-05,0.53013080152,2.9689454166],
        [1.232727e-05,1.58634458237,70.8494453042],[7.91206e-06,5.43641224143,3.1813937377],[7.66954e-06,1.99555409575,73.297125859],
      ],
      [
        [0.00053033277,0.0,0.0],[2.357636e-05,2.26014661705,74.7815985673],[7.69129e-06,4.52561041823,11.0457002639],
        [5.51533e-06,3.25814281023,63.7358983034],[5.41532e-06,2.27573907424,3.9321532631],[5.29473e-06,4.92348433826,1.4844727083],
      ],
    ],
    B: [
      [
        [0.01346277639,2.61877810545,74.7815985673],[0.00062341405,5.08111175856,149.5631971346],[0.00061601203,3.14159265359,0.0],
        [9.963744e-05,1.61603876357,76.2660712756],[9.926151e-05,0.57630387917,73.297125859],[3.259455e-05,1.2611938596,224.3447957019],
        [2.972318e-05,2.24367035538,1.4844727083],[2.010257e-05,6.05550401088,148.0787244263],[1.522172e-05,0.27960386377,63.7358983034],
        [9.24055e-06,4.03822927853,151.0476698429],[7.60624e-06,6.14000431923,71.8126531507],[5.22309e-06,3.3208519477,138.5174968707],
      ],
      [
        [0.00206366162,4.12394311407,74.7815985673],[8.56323e-05,0.33819986165,149.5631971346],[1.725703e-05,2.12193159895,73.297125859],
        [1.36886e-05,3.06861722047,76.2660712756],[1.374449e-05,0.0,0.0],
      ],
      [
        [9.211656e-05,5.80044305785,74.7815985673],[5.56926e-06,0.0,0.0],
      ],
    ],
    R: [
      [
        [19.21264847881,0.0,0.0],[0.88784984055,5.60377526994,74.7815985673],[0.03440835545,0.32836098991,73.297125859],
        [0.02055653495,1.78295170028,149.5631971346],[0.00649321851,4.52247298119,76.2660712756],[0.00602248144,3.86003820462,63.7358983034],
        [0.00496404171,1.40139934716,454.9093665273],[0.00338525522,1.58002682946,138.5174968707],[0.00243508222,1.57086595074,71.8126531507],
        [0.00190521915,1.99809364502,1.4844727083],[0.00161858251,2.79137863469,148.0787244263],[0.00143705902,1.38368574483,11.0457002639],
        [0.00093192359,0.17437193645,36.6485629295],[0.00071424265,4.24509327405,224.3447957019],[0.00089805842,3.66105366329,109.9456887885],
        [0.00039009624,1.66971128869,70.8494453042],[0.00046677322,1.39976563936,35.1640902212],[0.00039025681,3.36234710692,277.0349937414],
        [0.0003675516,3.88648934736,146.594251718],[0.00030348875,0.70100446346,151.0476698429],[0.00029156264,3.18056174556,77.7505439839],
        [0.00020471584,1.555889615,202.2533951741],[0.0002562036,5.25656292802,380.12776796],[0.00025785805,3.78537741503,85.8272988312],
        [0.00022637152,0.72519137745,529.6909650946],[0.00020473163,2.79639811626,70.3281804424],[0.00017900561,0.55455488605,2.9689454166],
        [0.00012328151,5.96039150918,127.4717966068],[0.00014701566,4.90434406648,108.4612160802],[0.00011494701,0.43774027872,65.2203710117],
        [0.00015502809,5.35405037603,38.1330356378],[0.00010792699,1.42104858472,213.299095438],[0.00011696085,3.29825599114,3.9321532631],
        [0.00011959355,1.75044072173,984.6003316219],[0.00012896507,2.62154018241,111.4301614968],[0.00011852996,0.99342814582,52.6901980395],
        [9.111446e-05,4.99638600045,62.2514255951],[8.42055e-05,5.25350716616,222.8603229936],[7.449125e-05,0.79491905956,351.8165923087],
        [8.402147e-05,5.03877516489,415.5524906121],[6.04637e-05,5.67960948357,78.7137518304],[5.524133e-05,3.11499484161,9.5612275556],
        [7.329454e-05,3.9727752784,183.2428146475],[5.444878e-05,5.10575635361,145.1097790097],[5.238103e-05,2.62960141797,33.6796175129],
        [4.079167e-05,3.22064788674,340.7708920448],[3.801606e-05,6.10985558505,184.7272873558],[3.919476e-05,4.25015288873,39.6175083461],
        [2.940492e-05,2.14637460319,137.0330241624],[3.781219e-05,3.45840272873,456.3938392356],[2.942239e-05,0.42393808854,299.1263942692],
        [3.686787e-05,2.48718116535,453.424893819],[3.101743e-05,4.14031063896,219.891377577],[2.962641e-05,0.82977991995,56.6223513026],
        [2.937799e-05,3.6765745093,140.001969579],[2.865128e-05,0.30996903761,12.5301729722],[2.538032e-05,4.85457831993,131.4039498699],
        [1.96251e-05,5.24342224065,84.3428261229],[2.36355e-05,0.44253328372,554.0699874828],[1.979394e-05,6.12836181686,106.9767433719],
        [2.182572e-05,2.94040431638,305.3461693927],[1.962974e-05,0.0411473912,221.3758502853],[1.82956e-05,4.01105771632,68.8437077341],
        [1.64292e-05,0.35564102554,67.6680515665],[1.58485e-05,3.16267171762,225.8292684102],[1.848655e-05,2.91111759376,909.8187330546],
        [1.63243e-05,4.23061792837,22.0914005278],[1.40139e-05,1.39084023521,265.9892934775],[1.403717e-05,5.63563637532,4.4534181249],
        [1.655866e-05,1.96431297431,79.2350166922],[1.248978e-05,5.44027380866,54.1746707478],[1.563447e-05,1.47917835549,112.9146342051],
        [1.248054e-05,4.88984353601,479.2883889155],[1.197439e-05,2.52185744943,145.6310438715],[1.506952e-05,5.24186185583,181.7583419392],
        [1.481746e-05,5.66203046912,152.5321425512],[1.438838e-05,1.53046287618,447.7958195265],[1.408514e-05,4.41921749601,462.0229135281],
        [1.477112e-05,4.32214690647,256.5399405065],[1.228314e-05,5.9770333104,59.8037450403],[1.249958e-05,6.24484546141,160.6088973985],
        [9.06468e-06,5.62025869483,74.6697239827],[1.090681e-05,4.15393813845,77.962992305],[8.44931e-06,0.12943398585,82.8583534146],
        [9.00363e-06,2.37315925843,74.8934731519],[1.071957e-05,1.74286714339,528.2064923863],[6.89708e-06,3.08097059985,69.3649725959],
        [5.93798e-06,4.50074517056,8.0767548473],[7.18559e-06,4.00047509264,128.9562693151],[6.99574e-06,0.03987168068,143.6253063014],
        [5.75656e-06,5.89552672641,66.70484372],[7.59004e-06,2.13700057433,692.5874843535],[7.10449e-06,5.41605755095,218.4069048687],
        [5.48672e-06,5.6281149697,3.1813937377],[6.51632e-06,4.42340061551,18.1592472647],[5.39825e-06,6.20788667166,71.6002048296],
        [5.44539e-06,5.69375108253,203.7378678824],[7.10276e-06,4.21967260022,381.6122406683],[5.93819e-06,3.83805798523,32.1951448046],
        [7.10134e-06,4.48972171999,293.188503436],[7.05482e-06,0.45521177725,835.0371344873],[5.88e-06,5.08252923316,186.2117600641],
        [5.98231e-06,0.35815291076,269.9214467406],[6.41914e-06,2.71127457036,87.3117715395],[6.30252e-06,4.46146214548,275.5505210331],
        [5.75195e-06,5.57862480486,2.4476805548],[5.6987e-06,1.6393093274,77.2292791221],[5.56672e-06,1.07231961344,1059.3819301892],
        [5.15534e-06,3.23274579379,284.1485407422],[5.42331e-06,5.39481705077,278.5194664497],[5.03096e-06,5.83931251717,191.2076949102],
      ],
      [
        [0.0147989637,3.67205705317,74.7815985673],[0.00071212085,6.22601006675,63.7358983034],[0.00068626972,6.13411265052,149.5631971346],
        [0.00020857262,5.24625494219,11.0457002639],[0.00021468152,2.6017670427,76.2660712756],[0.00024059649,3.14159265359,0.0],
        [0.00011405346,0.01848461561,70.8494453042],[7.496775e-05,0.42360033283,73.297125859],[4.2438e-05,1.41692350371,85.8272988312],
        [3.505936e-05,2.58354048851,138.5174968707],[3.228835e-05,5.25499602896,3.9321532631],[3.926694e-05,3.15513991323,71.8126531507],
        [3.06001e-05,0.15321893225,1.4844727083],[3.578446e-05,2.31160668309,224.3447957019],[2.564251e-05,0.98076846352,148.0787244263],
        [2.429445e-05,3.99440122468,52.6901980395],[1.644719e-05,2.65349313124,127.4717966068],[1.583766e-05,1.43045619196,78.7137518304],
        [1.413112e-05,4.57461892062,202.2533951741],[1.489525e-05,2.67559167316,56.6223513026],[1.403237e-05,1.36985349744,77.7505439839],
        [1.22822e-05,1.04703640149,62.2514255951],[1.508028e-05,5.05996325425,151.0476698429],[9.92085e-06,2.17168865909,65.2203710117],
        [1.032731e-05,0.26459059027,131.4039498699],[8.61867e-06,5.05530802218,351.8165923087],[7.44445e-06,3.07640148939,35.1640902212],
        [6.04362e-06,0.90717667985,984.6003316219],[6.46851e-06,4.4729042291,70.3281804424],[5.7471e-06,3.23070708457,447.7958195265],
        [6.8747e-06,2.49912565674,77.962992305],[6.23602e-06,0.8625307382,9.5612275556],[5.27794e-06,5.15136007084,2.9689454166],
        [5.61839e-06,2.7177815898,462.0229135281],[5.30364e-06,5.91655309045,213.299095438],
      ],
      [
        [0.00022439904,0.6995311876,74.7815985673],[4.727037e-05,1.69901641488,63.7358983034],[1.681903e-05,4.64833551727,70.8494453042],
        [1.433755e-05,3.52119917947,149.5631971346],[1.649559e-05,3.0966007898,11.0457002639],[7.70188e-06,0.0,0.0],
        [5.00429e-06,6.17229032223,76.2660712756],
      ],
      [
        [1.164382e-05,4.73453291602,74.7815985673],
      ],
    ],
  },
  neptune: {
    L: [
      [
        [5.31188633047,0.0,0.0],[0.01798475509,2.9010127305,38.1330356378],[0.01019727662,0.4858092366,1.4844727083],
        [0.00124531845,4.83008090682,36.6485629295],[0.0004206445,5.41054991607,2.9689454166],[0.00037714589,6.09221834946,35.1640902212],
        [0.00033784734,1.24488865578,76.2660712756],[0.00016482741,7.729261e-05,491.5579294568],[9.198582e-05,4.93747059924,39.6175083461],
        [8.994249e-05,0.27462142569,175.1660598002],[4.216235e-05,1.98711914364,73.297125859],[3.364818e-05,1.03590121818,33.6796175129],
        [2.2848e-05,4.20606932559,4.4534181249],[1.433512e-05,2.78340432711,74.7815985673],[9.0024e-06,2.07606702418,109.9456887885],
        [7.44996e-06,3.19032530145,71.8126531507],[5.06206e-06,5.74785370252,114.3991069134],
      ],
      [
        [38.37687716731,0.0,0.0],[0.00016604187,4.86319129565,1.4844727083],[0.00015807148,2.27923488532,38.1330356378],
        [3.334701e-05,3.6819967602,76.2660712756],[1.30584e-05,3.67320813491,2.9689454166],[6.04832e-06,1.50477747549,35.1640902212],
      ],
      [
        [0.00053892649,0.0,0.0],
      ],
    ],
    B: [
      [
        [0.03088622933,1.44104372626,38.1330356378],[0.00027780087,5.91271882843,76.2660712756],[0.00027623609,0.0,0.0],
        [0.0001535549,2.52123799481,36.6485629295],[0.00015448133,3.50877080888,39.6175083461],[1.999919e-05,1.50998669505,74.7815985673],
        [1.96754e-05,4.37778195768,1.4844727083],[1.015137e-05,3.21561035875,35.1640902212],[6.05767e-06,2.80246601405,73.297125859],
        [5.94878e-06,2.12892708114,41.1019810544],[5.88805e-06,3.18655882497,2.9689454166],
      ],
      [
        [0.00227279214,3.8079308987,38.1330356378],[1.80312e-05,1.97576485377,76.2660712756],[1.385733e-05,4.82555548018,36.6485629295],
        [1.4333e-05,3.14159265359,0.0],[1.073298e-05,6.08054240712,39.6175083461],
      ],
      [
        [9.690766e-05,5.57123750291,38.1330356378],
      ],
    ],
    R: [
      [
        [30.07013206102,0.0,0.0],[0.2706225949,1.3299945893,38.1330356378],[0.01691764281,3.25186138896,36.6485629295],
        [0.00807830737,5.18592836167,1.4844727083],[0.00537760613,4.52113902845,35.1640902212],[0.00495725642,1.57105654815,491.5579294568],
        [0.0027457197,1.84552256801,175.1660598002],[0.00135134095,3.37220607384,39.6175083461],[0.00121801825,5.79754444303,76.2660712756],
        [0.00100895397,0.37702748681,73.297125859],[0.00069791722,3.79617226928,2.9689454166],[0.00046687838,5.74937810094,33.6796175129],
        [0.00024593778,0.50801728204,109.9456887885],[0.00016939242,1.59422166991,71.8126531507],[0.00014229686,1.07786112902,74.7815985673],
        [0.00012011825,1.92062131635,1021.2488945514],[8.394731e-05,0.67816895547,146.594251718],[7.5718e-05,1.07149263431,388.4651552382],
        [5.720852e-05,2.59059512267,4.4534181249],[4.839672e-05,1.9068599107,41.1019810544],[4.483492e-05,2.90573457534,529.6909650946],
        [4.270202e-05,3.41343865825,453.424893819],[4.35379e-05,0.6798566237,32.1951448046],[4.420804e-05,1.74993796503,108.4612160802],
        [2.881063e-05,1.98600105123,137.0330241624],[2.635535e-05,3.09755943422,213.299095438],[3.38093e-05,0.84810683275,183.2428146475],
        [2.878942e-05,3.67415901855,350.3321196004],[2.306293e-05,2.80962935724,70.3281804424],[2.530149e-05,5.79839567009,490.0734567485],
        [2.523132e-05,0.48630800015,493.0424021651],[2.087303e-05,0.61858378281,33.9402499438],[1.976522e-05,5.1170304456,168.0525127994],
        [1.905254e-05,1.72186472126,182.279606801],[1.654039e-05,1.92782545887,145.1097790097],[1.435072e-05,1.70005157785,484.444382456],
        [1.403029e-05,4.58914203187,498.6714764576],[1.499193e-05,1.01623299513,219.891377577],[1.39886e-05,0.7622031762,176.6505325085],
        [1.403377e-05,6.07659416908,173.6815870919],[1.12856e-05,5.96661179805,9.5612275556],[1.228304e-05,1.59881465324,77.7505439839],
        [8.35414e-06,3.97066884218,114.3991069134],[8.11186e-06,3.0025888087,46.2097904851],[7.31925e-06,2.10447054189,181.7583419392],
        [6.15781e-06,2.97874625677,106.9767433719],[7.04778e-06,1.1873821088,256.5399405065],[5.0204e-06,1.38657803368,5.9378908332],
        [5.30357e-06,4.24059166485,111.4301614968],
      ],
      [
        [0.00236338502,0.70498011235,38.1330356378],[0.00013220279,3.32015499895,1.4844727083],[8.621863e-05,6.2162895163,35.1640902212],
        [2.70174e-05,1.88140666779,39.6175083461],[2.15315e-05,5.16873840979,76.2660712756],[2.154735e-05,2.09431198086,2.9689454166],
        [1.463924e-05,1.18417031047,33.6796175129],[1.603165e-05,0.0,0.0],[1.135773e-05,3.91891199655,36.6485629295],
        [8.9765e-06,5.24122933533,388.4651552382],[7.89908e-06,0.5331548458,168.0525127994],[7.6003e-06,0.02051033644,182.279606801],
        [6.07183e-06,1.0770650035,1021.2488945514],[5.71622e-06,3.40060785432,484.444382456],[5.6079e-06,2.88685815667,498.6714764576],
      ],
      [
        [4.247412e-05,5.89910679117,38.1330356378],
      ],
    ],
  },
};

function vsopSum(groups, tau) {
  let sum = 0;
  let p = 1;
  for (let i = 0; i < groups.length; i++) {
    const terms = groups[i];
    let s = 0;
    for (let k = 0; k < terms.length; k++) {
      const t = terms[k];
      s += t[0] * Math.cos(t[1] + t[2] * tau);
    }
    sum += s * p;
    p *= tau;
  }
  return sum;
}

function vsopSpherical(body, jd) {
  const tau = (jd - 2451545.0) / 365250.0;
  const s = VSOP87D[body];
  return {
    L: vsopSum(s.L, tau),
    B: s.B.length ? vsopSum(s.B, tau) : 0,
    R: vsopSum(s.R, tau),
  };
}

function vsopRect(sph) {
  const cb = Math.cos(sph.B);
  return [
    sph.R * cb * Math.cos(sph.L),
    sph.R * cb * Math.sin(sph.L),
    sph.R * Math.sin(sph.B),
  ];
}

// jdUT is Universal Time. Earth is taken at reception; the planet is taken
// one light-time earlier. Longitude is then apparent: nutation + annual aberration.
function vsopApparent(body, jdUT) {
  const jd = dynamicalJd(jdUT);
  const earth = vsopSpherical('earth', jd);
  const er = vsopRect(earth);
  let sph = vsopSpherical(body, jd);
  let pr = vsopRect(sph);
  let x = pr[0] - er[0];
  let y = pr[1] - er[1];
  let z = pr[2] - er[2];
  let dist = Math.sqrt(x * x + y * y + z * z);
  sph = vsopSpherical(body, jd - 0.0057755183 * dist);
  pr = vsopRect(sph);
  x = pr[0] - er[0];
  y = pr[1] - er[1];
  z = pr[2] - er[2];
  dist = Math.sqrt(x * x + y * y + z * z);
  const lon = Math.atan2(y, x);
  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const sunLon = mod360(toDeg(earth.L) + 180);
  const dAberr = -(20.49552 / 3600) * Math.cos(toRad(sunLon) - lon) / Math.cos(lat);
  return {
    lon: mod360(toDeg(lon) + dAberr + nutationInLongitude(jd)),
    lat: toDeg(lat),
    distance: dist,
  };
}

function mercuryPosition(jd) { return vsopApparent('mercury', jd); }
function venusPosition(jd)   { return vsopApparent('venus', jd); }
function marsPosition(jd)    { return vsopApparent('mars', jd); }
function jupiterPosition(jd) { return vsopApparent('jupiter', jd); }
function saturnPosition(jd)  { return vsopApparent('saturn', jd); }
function uranusPosition(jd)  { return vsopApparent('uranus', jd); }
function neptunePosition(jd) { return vsopApparent('neptune', jd); }

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
// Keplerian-element Pluto (JPL 1800–2050 elements) — fallback outside the
// 1885–2099 range where the Meeus periodic series below is valid.
function plutoPositionKepler(jd) {
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
  return helioToGeo(lon, lat, r, sun.lon, 0, sun.distance, jd);
}

// Pluto periodic series — Meeus Ch.37 (Table 37.A), valid 1885–2099 to ~0.07°.
// Coefficients verified to reproduce Meeus's worked example exactly
// (1992-10-13.0 → heliocentric L 232.74071°, B 14.58782°, r 29.711111 AU).
const PLUTO_ARG = [[0,0,1],[0,0,2],[0,0,3],[0,0,4],[0,0,5],[0,0,6],[0,1,-1],[0,1,0],[0,1,1],[0,1,2],[0,1,3],[0,2,-2],[0,2,-1],[0,2,0],[1,-1,0],[1,-1,1],[1,0,-3],[1,0,-2],[1,0,-1],[1,0,0],[1,0,1],[1,0,2],[1,0,3],[1,0,4],[1,1,-3],[1,1,-2],[1,1,-1],[1,1,0],[1,1,1],[1,1,3],[2,0,-6],[2,0,-5],[2,0,-4],[2,0,-3],[2,0,-2],[2,0,-1],[2,0,0],[2,0,1],[2,0,2],[2,0,3],[3,0,-2],[3,0,-1],[3,0,0]];
const PLUTO_LON = [[-19799805,19850055],[897144,-4954829],[611149,1211027],[-341243,-189585],[129287,-34992],[-38164,30893],[20442,-9987],[-4063,-5071],[-6016,-3336],[-3956,3039],[-667,3572],[1276,501],[1152,-917],[630,-1277],[2571,-459],[899,-1449],[-1016,1043],[-2343,-1012],[7042,788],[1199,-338],[418,-67],[120,-274],[-60,-159],[-82,-29],[-36,-29],[-40,7],[-14,22],[4,13],[5,2],[-1,0],[2,0],[-4,5],[4,-7],[14,24],[-49,-34],[163,-48],[9,-24],[-4,1],[-3,1],[1,3],[-3,-1],[5,-3],[0,0]];
const PLUTO_LAT = [[-5452852,-14974862],[3527812,1672790],[-1050748,327647],[178690,-292153],[18650,100340],[-30697,-25823],[4878,11248],[226,-64],[2030,-836],[69,-604],[-247,-567],[-57,1],[-122,175],[-49,-164],[-197,199],[-25,217],[589,-248],[-269,711],[185,193],[315,807],[-130,-43],[5,3],[2,17],[2,5],[2,3],[3,1],[2,-1],[1,-1],[0,-1],[0,0],[0,-2],[2,2],[-7,0],[10,-8],[-3,20],[6,5],[14,17],[-2,0],[0,0],[0,0],[0,1],[0,0],[1,0]];
const PLUTO_RAD = [[66865439,68951812],[-11827535,-332538],[1593179,-1438890],[-18444,483220],[-65977,-85431],[31174,-6032],[-5794,22161],[4601,4032],[-1729,234],[-415,702],[239,723],[67,-67],[1034,-451],[-129,504],[480,-231],[2,-441],[-3359,265],[7856,-7832],[36,45763],[8663,8547],[-809,-769],[263,-144],[-126,32],[-35,-16],[-19,-4],[-15,8],[-4,12],[5,6],[3,1],[6,-2],[2,2],[-2,-2],[14,13],[-63,13],[136,-236],[273,1065],[251,149],[-25,-9],[9,-2],[-8,7],[2,-10],[19,35],[10,3]];

function plutoHelioMeeus(T) {
  const J = 34.35 + 3034.9057 * T, S = 50.08 + 1222.1138 * T, P = 238.96 + 144.96 * T;
  let cl = 0, cb = 0, cr = 0;
  for (let n = 0; n < PLUTO_ARG.length; n++) {
    const a = PLUTO_ARG[n], al = toRad(mod360(a[0] * J + a[1] * S + a[2] * P));
    const sa = Math.sin(al), ca = Math.cos(al);
    cl += PLUTO_LON[n][0] * sa + PLUTO_LON[n][1] * ca;
    cb += PLUTO_LAT[n][0] * sa + PLUTO_LAT[n][1] * ca;
    cr += PLUTO_RAD[n][0] * sa + PLUTO_RAD[n][1] * ca;
  }
  return { lon: 238.958116 + 144.96 * T + cl / 1e6, lat: -3.908239 + cb / 1e6, r: 40.7241346 + cr / 1e7 };
}

function plutoPosition(jd) {
  const yr = 2000 + (jd - 2451545.0) / 365.25;
  if (yr < 1885 || yr > 2099) return plutoPositionKepler(jd);
  const h = plutoHelioMeeus((jd - 2451545.0) / 36525.0);
  const sun = sunPosition(jd);
  return helioToGeo(h.lon, h.lat, h.r, sun.lon, 0, sun.distance, jd);
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
window.AstroEphemeris.plutoHelioMeeus    = plutoHelioMeeus;
window.AstroEphemeris.precessionToDate   = precessionToDate;
window.AstroEphemeris.deltaTSeconds      = deltaTSeconds;
window.AstroEphemeris.allPlanetPositions = allPlanetPositions;
window.AstroEphemeris.mod360             = mod360;
window.AstroEphemeris.chironPosition     = chironPosition;
window.AstroEphemeris.lunarNode          = lunarNode;
window.AstroEphemeris.nodePosition       = nodePosition;
