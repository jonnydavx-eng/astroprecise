import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// The engine contains two `function moonPosition` declarations (the second
// intentionally replaces the first). That is legal in CJS function scope but
// a SyntaxError in ESM module scope, so it must be loaded via require().
const E = require('./index.cjs');

export const {
  julianDay,
  obliquityOfEcliptic,
  nutationLongitude,
  greenwichSiderealTime,
  localSiderealTime,
  sunPosition,
  moonPosition,
  moonDistance,
  geocentricPlanetLongitude,
  planetPosition,
  allPlanetPositions,
  ascendant,
  midheaven,
  placidusHouses,
  calculateAspects,
  isRetrograde,
  calculateNatalChart,
  lunarNode,
  chironPosition,
  mod360,
  toRad,
  toDeg,
  signOf,
  signName,
  degreeInSign,
  CITIES,
  SIGNS,
  ELEMENTS,
  MODALITIES,
  SIGN_RULERS,
  ASPECT_DEFS,
  DAILY_MOTION,
} = E;

export default E;
