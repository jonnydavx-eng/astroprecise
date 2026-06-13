# Credits & asset licences

## Planet & moon textures
The photoreal hero orrery (`js/orrery-webgl.js`) uses equirectangular surface
maps from **Solar System Scope** — https://www.solarsystemscope.com/textures/ —
licensed under **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/).
Maps were downscaled/recompressed for web delivery; no other changes.

Files: `assets/textures/{mercury,venus,earth,earth_clouds,mars,jupiter,saturn,
saturn_ring,uranus,neptune,moon}.*`. The Sun is rendered procedurally (no asset).

**Attribution requirement:** CC BY 4.0 requires visible credit. Before public
launch, surface a credit line (e.g. site footer or an /about-credits page):
> "Planet textures © Solar System Scope, CC BY 4.0."

## 3D engine
**Three.js** (r160), MIT licence — vendored at `js/vendor/three/three.module.min.js`,
served locally (no runtime CDN), per the site's privacy/offline model.

## Astronomy
Positions computed in-browser from the project's VSOP87/ELP2000 engine
(`js/ephemeris.js`). No external ephemeris calls.
