// GENERATED — canonical source: OrbitLab js/. Edit there, sync via scripts/sync-to-astroprecise.mjs
/**
 * OrbitLab — canonical solar-system body configuration.
 *
 * POSITIONS in the WebGL orrery come from VSOP87/ELP2000 (window.AstroEphemeris) —
 * not from the Kepler elements below. The elements are J2000 osculating averages
 * used for education (orbital period, eccentric path guides) and spin rates.
 *
 * VISUAL SCALE COMPROMISE (classic orrery convention):
 *   R  — schematic orbit radius in scene units (even spacing for readability)
 *   size — display sphere radius (exaggerated; NOT to-scale with R)
 * Real heliocentric distances (AU) and speeds are shown in the info panel from ephemeris.
 */

export const SUN_SIZE = 2.35;

/** Mean orbital elements at J2000.0 (NASA/JPL fact sheet averages). Angles in degrees. */
export const ORBITAL_ELEMENTS = {
  mercury: { a: 0.387, e: 0.2056, i: 7.00, Omega: 48.33, omega: 29.12, periodDays: 87.97 },
  venus:   { a: 0.723, e: 0.0068, i: 3.39, Omega: 76.68, omega: 54.89, periodDays: 224.70 },
  earth:   { a: 1.000, e: 0.0167, i: 0.00, Omega: 0.00,  omega: 102.95, periodDays: 365.26 },
  mars:    { a: 1.524, e: 0.0934, i: 1.85, Omega: 49.56, omega: 286.50, periodDays: 686.98 },
  jupiter: { a: 5.203, e: 0.0484, i: 1.30, Omega: 100.56, omega: 273.87, periodDays: 4332.59 },
  saturn:  { a: 9.537, e: 0.0542, i: 2.49, Omega: 113.72, omega: 339.39, periodDays: 10759.22 },
  uranus:  { a: 19.19, e: 0.0472, i: 0.77, Omega: 74.01, omega: 96.99, periodDays: 30685.40 },
  neptune: { a: 30.07, e: 0.0086, i: 1.77, Omega: 131.78, omega: 276.34, periodDays: 60189.00 },
};

/**
 * Bodies rendered in the heliocentric scene.
 * siderealPeriodHours — equatorial rotation (Earth=24, Venus retrograde = negative).
 * spin — legacy visual multiplier; overridden at runtime by siderealSpinRadPerSec().
 */
export const BODIES = [
  { id: 'mercury', name: 'Mercury', R: 5.0,  size: 0.30, spin: 0.18, siderealPeriodHours: 1407.6, color: 0x9a8f86, tex: 'mercury.jpg' },
  { id: 'venus',   name: 'Venus',   R: 7.0,  size: 0.54, spin: 0.12, siderealPeriodHours: -5832.5, color: 0xd8b878, tex: 'venus.jpg', luminous: true },
  { id: 'earth',   name: 'Earth',   R: 9.5,  size: 0.85, spin: 0.55, siderealPeriodHours: 23.9345, color: 0x2a6cb0, tex: 'earth.jpg', hero: true },
  { id: 'mars',    name: 'Mars',    R: 12.5, size: 0.42, spin: 0.52, siderealPeriodHours: 24.623, color: 0xb84a32, tex: 'mars.jpg' },
  { id: 'jupiter', name: 'Jupiter', R: 17.0, size: 1.25, spin: 1.20, siderealPeriodHours: 9.925, color: 0xc7a06a, tex: 'jupiter.jpg' },
  { id: 'saturn',  name: 'Saturn',  R: 21.5, size: 1.05, spin: 1.05, siderealPeriodHours: 10.656, color: 0xcdba8e, tex: 'saturn.jpg', ring: 'saturn_ring.png' },
  { id: 'uranus',  name: 'Uranus',  R: 25.5, size: 0.66, spin: 0.70, siderealPeriodHours: -17.24, color: 0x9ed1e8, tex: 'uranus.jpg' },
  { id: 'neptune', name: 'Neptune', R: 29.0, size: 0.64, spin: 0.68, siderealPeriodHours: 16.11, color: 0x6f9fd8, tex: 'neptune.jpg' },
];

/* Visual tuning synced from AstroPrecise orrery-webgl (2026-07-09):
   richer outer-planet atmospheres + softer limb for free-explore portraits. */
export const PLANET_VIS = {
  mercury: { roughness: 0.82, metalness: 0.0,  atmo: 0x9a9088, atmoS: 1.02, atmoI: 0.14, rim: 0x6a8090 },
  venus:   { roughness: 0.72, metalness: 0.0,  atmo: 0xffc878, atmoS: 1.038, atmoI: 0.48, rim: 0xffa060 },
  earth:   { roughness: 0.72, metalness: 0.05, atmo: 0x4a9aff, atmoS: 1.022, atmoI: 1.12, rim: 0x68a8e8 },
  mars:    { roughness: 0.76, metalness: 0.03, atmo: 0xff6038, atmoS: 1.034, atmoI: 0.48, rim: 0xd07048 },
  jupiter: { roughness: 0.78, metalness: 0.03, atmo: 0xf4c078, atmoS: 1.028, atmoI: 0.52, rim: 0xe8b070 },
  saturn:  { roughness: 0.78, metalness: 0.03, atmo: 0xfae6c0, atmoS: 1.024, atmoI: 0.46, rim: 0xe0c498 },
  uranus:  { roughness: 0.58, metalness: 0.03, atmo: 0xa0e0f8, atmoS: 1.032, atmoI: 0.48, rim: 0x90d8f0 },
  neptune: { roughness: 0.56, metalness: 0.03, atmo: 0x78a8f0, atmoS: 1.032, atmoI: 0.50, rim: 0x70a8e8 },
};

export const SCALE_DOC = {
  positions: 'VSOP87 truncated series + ELP2000-82B (live, sub-arcminute for inner planets)',
  orbitRadii: 'Schematic concentric R — spacing for clarity, not true AU scale',
  bodySizes: 'Exaggerated sphere radii — inner worlds enlarged so features read on screen',
  guides: 'Optional dashed Kepler ellipses use J2000 elements scaled to schematic R',
};