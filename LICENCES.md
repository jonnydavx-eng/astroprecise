# LICENCES — third-party material in AstroPrecise and the Natal Sky Print Pack

Written 2026-10-20. Every "verified" line below was checked against the actual file in this
repository on that date (font binaries decompressed and their embedded name tables read; texture
source notes and `website/data/third-party-credits.json` read; engine source read). Anything not
checked is marked UNVERIFIED. This file lists licences; it is not legal advice.

The pack's own text, design, computed output and the AstroPrecise name remain AstroPrecise
copyright. The customer-facing personal-use terms live in `tools/package-studio-order.mjs`.

## 1. Fonts (`website/fonts/`)

All sixteen WOFF2 files carry an embedded SIL Open Font License 1.1 URL (either
`scripts.sil.org/OFL` or `openfontlicense.org`), except `cinzel-hero-700.woff2`, whose subset
dropped the licence string but keeps the same Cinzel Project copyright as the three Cinzel files
that do carry it. The common licence text and copyright notices are in
`website/fonts/licenses/OFL-1.1.txt`; the per-file map and SHA-256 inventory are in
`website/fonts/licenses/README.md` (verified there 2026-08-23, re-verified here 2026-10-20).

| Family (local files) | Embedded copyright | Licence | Used in the print pack |
|---|---|---|---|
| Noto Sans Symbols (`astro-glyphs.woff2`, CSS alias `AstroGlyph`) | Copyright 2022 The Noto Project Authors | SIL OFL 1.1 — verified (embedded URL) | Yes: zodiac and planet glyphs |
| Cinzel (`cinzel-normal-400/600/700`, `cinzel-hero-700`) | Copyright 2020 The Cinzel Project Authors | SIL OFL 1.1 — verified (embedded URL in the three normal files; hero subset: copyright only) | Yes: headings, labels |
| Cormorant Garamond (`cormorant-garamond-normal-400/500/600`, `italic-400/500`) | Copyright 2015 The Cormorant Project Authors | SIL OFL 1.1 — verified (embedded URL) | Yes: body text |
| Inter (`inter-normal-300/400/500/600`) | Copyright 2016 The Inter Project Authors | SIL OFL 1.1 — verified (embedded URL) | No (website only) |
| IBM Plex Mono (`ibm-plex-mono-normal-400`) | Copyright 2017 IBM Corp., Reserved Font Name "Plex" | SIL OFL 1.1 — verified (embedded URL) | No (website only) |
| Schibsted Grotesk (`schibsted-grotesk-latin-var`) | Copyright 2023 The Schibsted-Grotesk Project Authors | SIL OFL 1.1 — verified (embedded URL) | No (website only) |

Note: `website/css/fonts.css` and `tools/fulfil-shared.mjs` describe the glyph font as "Noto Sans
Symbols 2". The binary identifies itself as Noto Sans Symbols. Same project, same licence; the
comments are the wrong name.

OFL conditions that matter for the pack: the fonts may be embedded in PDFs and bundled with the
files; keep the copyright notices and the licence text with any redistributed font binaries; the
fonts themselves may not be sold on their own.

## 2. Ephemeris engine and astronomical data

- **Engine**: `website/js/ephemeris.js` (mirrored into `ephemeris-package/`, published as
  `@astro-precise/ephemeris`, licence **MIT** per its `package.json`). It is a pure-JavaScript
  implementation of the Meeus algorithms with truncated VSOP87 (planets) and ELP2000 (Moon)
  series, plus Espenak–Meeus and Stephenson–Morrison–Hohenkerk ΔT polynomials. VSOP87 and
  ELP2000 are published scientific series (Bureau des Longitudes / IMCCE); their coefficients are
  used freely in published software and carry no copyleft obligation. No Swiss Ephemeris code
  runs at runtime, and no `.se1` data file is bundled.
- **Swiss Ephemeris as a test reference (not shipped)**: `test-accuracy-20charts.fixtures.json`,
  `test-engine-swiss.mjs`, `test-chiron-swiss.mjs` and `tools/accuracy/gen-swiss-fixtures.py`
  use `pyswisseph` (Moshier mode) only to generate and compare reference positions in the test
  suite. Test fixtures do not ship with the site or the pack.
- **LAUNCH BLOCKER TO CHECK — Chiron table**: `website/js/ephemeris.js` contains `CHIRON_TAB`, a
  1850–2150 table of Chiron positions that its own comment says was "taken from Swiss Ephemeris
  2.10 (seas_18.se1, regenerate with tools/accuracy/gen-chiron-table.py)". That is runtime data
  derived from a Swiss Ephemeris data file, shipped in the web app and used by every chart that
  shows Chiron (the print pack's wheel and ledger include Chiron). Swiss Ephemeris is dual-licensed
  AGPL-3.0 or Astrodienst professional licence (see `docs/DECISION-LOG.md`, DEC-2026-08-06-02,
  which rejected adopting Swiss Ephemeris code for exactly this reason but did not cover this
  table). Whether a table of computed output positions is a derivative of the licensed data file
  is a legal question, not a code question. Options: (a) confirm with Astrodienst / counsel that
  computed output tables are unrestricted, (b) regenerate the table from a non-Swiss source
  (e.g. JPL Horizons, whose output is free to use), or (c) drop Chiron from shipped products.
  Decide before selling anything that shows Chiron.
- **Star catalogue**: `website/js/starcatalog.js` is a hand-compiled table of 253 stars (name,
  constellation, J2000 coordinates, distance, spectral type, magnitude, one fact line). Its header
  credits RECONS / Gaia nearest-star lists, Hipparcos / Gaia parallaxes and SIMBAD coordinates.
  These are factual astronomical measurements, not a copied catalogue file; no HYG, Yale Bright
  Star Catalogue or Hipparcos data file is bundled. Credit line to carry: "Star data: ESA Hipparcos
  and Gaia, RECONS, CDS SIMBAD." The star catalogue is not used by the print pack (the pack's
  starfield is a seeded decorative pattern, not real stars).

## 3. Planet-map textures (`website/assets/textures/`)

Credits and licences are recorded in `website/data/third-party-credits.json` (schema
`astroprecise-third-party-credits-v1`, updated 2026-08-24) and in the per-set source notes
`nasa-rocky-source.txt`, `gas-giants-source.txt`, `ice-giants-source.txt`, `pluto-source.txt`.
The packaging tool already writes these into every customer folder as `THIRD-PARTY-CREDITS.txt`.

| Work | Creator / source | Licence |
|---|---|---|
| Mercury, Venus, Earth, Moon, Mars surface maps | NASA / USGS Astrogeology hosted products | Public domain (US Government) — verified from source notes |
| Jupiter, Saturn, Uranus, Neptune maps | NASA / ESA Hubble OPAL, STScI, PI Amy Simon, GO 13937, DOI 10.17909/T9G593 | CC BY 4.0 — verified from source notes; attribution required |
| Pluto global mosaic | NASA / JHUAPL / SwRI New Horizons | Public domain — verified from source notes |
| Earth cloud, night-light, normal and specular overlays; Saturn ring strip | Solar System Scope | CC BY 4.0 — recorded in credits JSON; attribution required |
| Three.js r160 (vendored) | Three.js authors | MIT — recorded in credits JSON |

None of these textures is used by the Natal Sky Print Pack; they belong to the 3D Observatory on
the website. They are listed so the credits file that ships with every pack stays accurate.

## 4. Adobe Firefly / stock imagery

Not used in the print pack and not used as live planet skins (`ART-LIST-2026-08-21.md` and
`DESIGN.md` forbid Firefly or stock art for the planet maps). Some marketing plates were made in
Adobe tools (`tools/adobe/`); their generative-content terms are **UNVERIFIED** here and would
need checking before any such plate is sold or printed.

## 5. Build-time tooling (not shipped to customers)

`playwright-core` (Apache-2.0), `sharp` (Apache-2.0), `pdf-lib` (MIT), `pdfjs-dist`
(Apache-2.0), `jszip` (MIT or GPL-3.0, used under MIT), `@napi-rs/canvas` (MIT). These render or
check files locally; none of their code is included in the delivered PDFs or PNGs. The sample pack
renders through the operator's locally installed Chrome, Edge or Playwright Chromium.

## 6. Where this is referenced

- `tools/sample-print-pack.mjs` writes `PRINT-GUIDE.txt` and `SAMPLE-README.txt` pointing here.
- `website/fonts/licenses/README.md` holds the detailed font map and hashes.
- `website/data/third-party-credits.json` is the single source for customer-facing credits.
