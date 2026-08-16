# Credits & asset licences

## Planet & moon textures
The photoreal hero orrery (`js/orrery-webgl.js`) uses equirectangular surface
maps. Body maps for Mercury, Venus, Earth, Moon and Mars are NASA / USGS
hosted products, resize only — see `assets/textures/nasa-rocky-source.txt`.
Uranus and Neptune are Hubble OPAL; Pluto is New Horizons. Remaining overlays
and the Saturn ring strip are still Solar System Scope (CC BY 4.0).

**Mercury, Venus, Earth (body), Moon, Mars** — NASA / USGS, public domain.
Resize only to 2048×1024 / 1024×512 / 512×256. No painting.
See `assets/textures/nasa-rocky-source.txt`.
- Mercury: MESSENGER MDIS color mosaic 665 m (1000/750/430 nm). Official
  product has small black gap tiles and a south-polar fringe.
- Venus: Magellan C3-MIDR radar + colorized GTDR topography. No optical
  global surface map exists (cloud deck).
- Earth body: Blue Marble Next Generation July 2004 (MODIS, cloud-free)
  with topography and bathymetry. `earth_clouds` / lights / normal / specular
  were not replaced.
- Moon: NASA SVS CGI Moon Kit 2025 LROC WAC color (643/566/415 nm). Poles
  in the official SVS file are LOLA albedo fill.
- Mars: Viking Orbiter global color mosaic 925 m (green synthesized in the
  official USGS product).

**Jupiter and Saturn** use NASA/ESA Hubble OPAL color global maps (PI: Simon,
GO13937), archived by STScI, DOI 10.17909/T9G593, CC BY 4.0. Larger encodes,
resize only. Saturn's equatorial black is the official ring-plane mask and was
not painted. See `assets/textures/gas-giants-source.txt`.

**Uranus and Neptune** use NASA/ESA Hubble OPAL color global maps (PI: Simon,
GO13937), archived by STScI, DOI 10.17909/T9G593, CC BY 4.0. Resize only.
The Uranus south is unobserved in the source (black night-side in the official STScI product). See `assets/textures/ice-giants-source.txt`.

**One documented edit, Neptune only:** pixels where only some of the three filters
have coverage were composited by the archive into saturated pure-blue/pure-green
artefacts along the coverage edge. Those are not measurements, so they are marked
as no-data rather than shown as atmosphere — a pixel counts as valid only where all
three filters have data. That moves 5.78% of the map to no-data. Nothing was painted
in. Uranus is deliberately not masked. Full rule in `assets/textures/ice-giants-source.txt`.

**Pluto** uses the USGS/NASA New Horizons LORRI+MVIC global mosaic (July 2017),
public domain (NASA/JHUAPL/SwRI/USGS). Resize only; south of about 30 deg S is
black in the official product and was not painted. See `assets/textures/pluto-source.txt`.

**Solar System Scope** — https://www.solarsystemscope.com/textures/ —
licensed under **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/).
Still used for `earth_clouds`, `earth_lights`, `earth_normal`, `earth_specular`,
and `saturn_ring`.

**Attribution requirement:** CC BY 4.0 requires visible credit. Before public
launch, surface a credit line (e.g. site footer or an /about-credits page):
> "Planet textures: NASA/USGS (Mercury, Venus, Earth, Moon, Mars); NASA/ESA Hubble OPAL / STScI (Jupiter, Saturn, Uranus, Neptune); NASA/JHUAPL/SwRI/USGS New Horizons (Pluto); Solar System Scope CC BY 4.0 (Earth overlays, Saturn ring). Uranus south and Pluto south of ~30°S unobserved in the source."

## 3D engine
**Three.js** (r160), MIT licence — vendored at `js/vendor/three/three.module.min.js`,
served locally (no runtime CDN), per the site's privacy/offline model.

## Astronomy
Positions computed in-browser from the project's VSOP87/ELP2000 engine
(`js/ephemeris.js`). No external ephemeris calls.
