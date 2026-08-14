# Credits & asset licences

## Planet & moon textures

The photoreal hero orrery (`js/orrery-webgl.js`) uses equirectangular surface maps
from three different sources. They are **not** interchangeable and must not be
credited as one — per-file provenance notes live next to the assets
(`assets/textures/ice-giants-source.txt`, `assets/textures/pluto-source.txt`).

### Solar System Scope — CC BY 4.0

https://www.solarsystemscope.com/textures/ ·
licence https://creativecommons.org/licenses/by/4.0/

Files: `assets/textures/{mercury,venus,earth,earth_clouds,earth_lights,earth_normal,
earth_specular,mars,jupiter,saturn,saturn_ring,moon}.*`. Maps were
downscaled/recompressed for web delivery; no other changes.

**Owner-managed bodies — do not let this section overwrite their credit.** The project
owner reports replacement maps that have not reached this branch:

| Bodies | Owner's source | Note file expected |
|---|---|---|
| Jupiter, Saturn | Hubble OPAL (larger encodes) | `gas-giants-source.txt` |
| Mercury, Venus, Earth, Moon, Mars | NASA / USGS | `nasa-rocky-source.txt` |

All of those maps are byte-identical to base here and neither note file exists on this
branch, so they are listed above under Solar System Scope because that is what the
files here actually are. **This branch deliberately claims nothing about the owner's
versions either way** — it could not verify them. On merge into a tree that has them,
keep that tree's attribution and remove those body names from the Solar System Scope
list above.

`test-planet-maps.mjs` enforces the move automatically: as soon as a `*-source.txt`
note appears for a body, that body must leave this section. It spares the pieces that
stay Solar System Scope even when the body map underneath changes — `saturn_ring`, and
the Earth overlays `earth_clouds`, `earth_lights`, `earth_normal` and `earth_specular`,
which the owner confirms were not part of the rocky-map write.

**Attribution requirement:** CC BY 4.0 requires visible credit. The site footer
(`js/ap-footer-inject.js`) carries it:
> "Planet textures © Solar System Scope, CC BY 4.0."

### Uranus & Neptune — NASA/ESA Hubble, OPAL programme (CC BY 4.0)

Files: `assets/textures/{uranus,neptune}.*` — Hubble WFC3/UVIS global maps from the
Outer Planet Atmospheres Legacy (OPAL) programme, Uranus 2025a and Neptune 2025b.
DOI [10.17909/T9G593](https://dx.doi.org/10.17909/T9G593) ·
programme page https://archive.stsci.edu/hlsp/opal

> This work used data acquired from the NASA/ESA HST Space Telescope, associated
> with OPAL program (PI: Simon, GO13937), and archived by the Space Telescope
> Science Institute, which is operated by the Association of Universities for
> Research in Astronomy, Inc., under NASA contract NAS 5-26555. All maps are
> available at http://dx.doi.org/10.17909/T9G593.

Honest caveats, because these are science maps and not poster art: both are
narrow/medium-band filter composites rather than true colour, both have real
unobserved regions left black (Uranus ~40% of map area, Neptune ~18%), and the
official products are only 721×361 — the shipped 2048×1024 tier is an upscale.
Neptune reads green rather than Voyager blue; that is the real product and is left
alone. Details and measurements in `assets/textures/ice-giants-source.txt`.

**One documented edit, Neptune only:** pixels where only some of the three filters
have coverage were composited by the archive into saturated pure-blue/pure-green
artefacts along the coverage edge. Those are not measurements, so they are marked
as no-data rather than shown as atmosphere — a pixel counts as valid only where all
three filters have data. That moves 5.78% of the map to no-data (12.4% → 18.2%) and
leaves the well-observed disc bit-identical. Nothing was painted in; invalid pixels
are marked absent. Uranus is deliberately NOT masked. Full rule, thresholds and
measurements in `assets/textures/ice-giants-source.txt`.

### Pluto — NASA / Johns Hopkins APL / SwRI (public domain)

Files: `assets/textures/pluto.*` — the New Horizons global colour mosaic
("Pluto Global Color Map", JPL Photojournal PIA11707), Ralph/MVIC three-filter
mosaic from the 2015-07-14 flyby.
https://science.nasa.gov/resource/pluto-global-color-map/

NASA imagery, public domain. Credit: **NASA / Johns Hopkins APL / SwRI**.
About 30% of the map is black south of ~−55° latitude — that hemisphere was in
polar night during the flyby and was never imaged. It was not painted in. Details
in `assets/textures/pluto-source.txt`.

`img/engine/pluto.webp` is derived from this map: the same mosaic on a lit sphere,
rendered by `tools/make-engine-stills.mjs`. It replaced a hand-painted procedural
disc that predated any real Pluto map being in the repo. 5.5% of the visible disc
carries no data and is left black rather than filled in.

The Sun is rendered procedurally (no asset).

## 3D engine
**Three.js** (r160), MIT licence — vendored at `js/vendor/three/three.module.min.js`,
served locally (no runtime CDN), per the site's privacy/offline model.

## Astronomy
Positions computed in-browser from the project's VSOP87/ELP2000 engine
(`js/ephemeris.js`). No external ephemeris calls.
