# @astro-precise/ephemeris

Offline VSOP87/ELP2000 ephemeris and natal chart engine based on Meeus,
*Astronomical Algorithms* (2nd ed.). Zero dependencies, no network, no build
step. Works in Node (CJS and ESM) and in the browser as a plain script.

## Accuracy — read this first

The series are **truncated**: planetary longitudes are good to roughly an
arcminute (~0.02°), the Moon uses a 60-term ELP2000 table, and Chiron/Pluto
use simplified mean-element models. That is more than enough for astrology
(sign and degree placement) and casual astronomy, but **not** for
professional, occultation, or sub-arcsecond work — use a JPL ephemeris for
that.

## Install

```sh
npm install @astro-precise/ephemeris
```

## Usage (ESM)

```js
import {
  julianDay,
  sunPosition,
  moonPosition,
  allPlanetPositions,
  calculateNatalChart,
} from '@astro-precise/ephemeris';

const jd = julianDay(2000, 1, 1, 12, 0, 0);   // 2451545 (J2000.0)

sunPosition(jd);   // { lon, lat, distance }  — degrees, degrees, AU
moonPosition(jd);  // { lon, lat, distance }  — degrees, degrees, km

// All 12 bodies at once; every entry has at least { lon } in [0, 360)
const all = allPlanetPositions(jd);
// { Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn,
//   Uranus, Neptune, Pluto, Chiron, NorthNode }
// Sun and Moon also carry lat/distance.
```

## Usage (CommonJS)

```js
const {
  julianDay,
  geocentricPlanetLongitude,
  calculateNatalChart,
} = require('@astro-precise/ephemeris');

const jd = julianDay(1992, 10, 13, 0, 0, 0);
geocentricPlanetLongitude('mars', jd);  // plain number, degrees
```

## Full natal chart (the easy path)

`calculateNatalChart` does everything — Julian day, obliquity, sidereal time,
all bodies, angles, Placidus houses, and aspects — from civil **Universal
Time** and geographic coordinates:

```js
// 1990-06-15 12:00 UT, London (lat 51.5074, lon -0.1278; east-positive)
const chart = calculateNatalChart(1990, 6, 15, 12, 0, 51.5074, -0.1278);

chart.positions.sun;
// { longitude: 84.13, sign: 'Gemini', degree: 24.13, retrograde: false }
chart.houses;       // array of 12 cusp longitudes (Placidus), degrees
chart.aspects;      // [{ planet1, planet2, aspect, orb, applying }, ...]
chart.ascendant;    // degrees
chart.midheaven;    // degrees
chart.dominantElement; chart.dominantModality; chart.chartRuler;
```

Note: inputs are UT, not local clock time — convert time zones yourself
(e.g. via `Intl.DateTimeFormat`) before calling.

## Lower-level API

Signatures matter here — several functions take *sidereal time*, not a
Julian day:

| Function | Signature | Returns |
|---|---|---|
| `julianDay` | `(year, month, day, hour, min, sec)` | number (JD) |
| `sunPosition` | `(jd)` | `{ lon, lat, distance }` (AU) |
| `moonPosition` | `(jd)` | `{ lon, lat, distance }` (km) |
| `geocentricPlanetLongitude` | `(planet, jd)` — name lowercase, e.g. `'mars'` | number, degrees |
| `planetPosition` | alias of `geocentricPlanetLongitude` | number, degrees |
| `lunarNode` / `chironPosition` | `(jd)` | number, degrees |
| `ascendant` | **`(lst, lat, eps)`** — local sidereal time (deg), latitude, obliquity. **Not** `(jd, lat, lon)`. | number, degrees |
| `midheaven` | `(lst, eps)` | number, degrees |
| `placidusHouses` | `(mcLon, ascLon, lat, eps)` | array of 12 cusps |
| `calculateAspects` | `(positions, jd)` — positions is `{ name: lonDegrees }` | array of aspect objects |
| `isRetrograde` | `(planet, jd)` | boolean |
| `localSiderealTime` | `(jd, longitude)` | degrees |
| `obliquityOfEcliptic` | `(T)` — Julian centuries since J2000 | degrees |

If you want the ascendant by hand:

```js
const T   = (jd - 2451545.0) / 36525;
const eps = obliquityOfEcliptic(T);
const lst = localSiderealTime(jd, longitude);
const asc = ascendant(lst, latitude, eps);
```

Helpers and data: `mod360`, `signOf(lon)` / `signName(lon)`,
`degreeInSign(lon)`, `SIGNS`, `ELEMENTS`, `MODALITIES`, `SIGN_RULERS`,
`ASPECT_DEFS`, and `CITIES` (150+ cities with `lat`, `lon`, and IANA `tz`).

## Browser

The engine is the same file that powers the AstroPrecise website. In a
browser, skip this package and load the script directly — it attaches
everything to `window.AstroEphemeris`:

```html
<script src="js/ephemeris.js"></script>
<script>
  const chart = window.AstroEphemeris.calculateNatalChart(1990, 6, 15, 12, 0, 51.5074, -0.1278);
</script>
```

## Maintenance

`ephemeris.cjs` is a verbatim copy of `website/js/ephemeris.js` with a
provenance header. Never edit it directly — run `npm run sync` (also runs
automatically on `prepack`). It must stay CommonJS: the source intentionally
declares `moonPosition` twice (the later definition wins), which is legal in
CJS function scope but a SyntaxError in ESM module scope.

## License

MIT
