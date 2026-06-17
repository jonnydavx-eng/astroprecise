# ephemeris.js principal transform — verified plan (2026-06-13)

**Status (Wave 20, ap-v405):** **Applied** — **A**, **D**, **B**, **C**, **Pluto** (Meeus Ch37), **E**, **F**, **G** (`408509e` + apparent-Sun ~1′ comment); `test-engine` **16/16**.

Source: 5-lens workflow audit, 13 findings adversarially reproduced in Node. Constraints: single static
file, no build, keep `window.AstroEphemeris`, "every number is real / unavailable is labelled".

## APPLY (ordered; A,D before F)
- **A** zodiac-sphere.js:492 `geocentricPlanetLongitude` → `planetLongitude` (LIVE bug: Pluto ~78°/2.5 signs wrong on screen).
- **D** oracle.js:754 fallback `geocentricPlanetLongitude` → `planetLongitude`.
- **PLUTO** plutoPosition is a linear mean-element formula → full sign wrong most years (1995/2008/2024 ingresses all fail). Replace with Meeus Ch37 periodic-terms Pluto (valid 1885-2099). GATE on sign-era validation across 1950-2030; if any fail, revert + label provenance instead.
- **B** calculateNatalChart: reject non-finite / out-of-range lat[-90,90] lon[-180,180]; Number-coerce all numeric args (kills "12"-string → 49-day JD bug).
- **dominantElement**: skip undefined signs so it can't fabricate 'Fire'.
- **C** calculateAspects: skip the node↔node opposition (construction artifact in every chart).
- **E** delete dead shadowed moonPosition #1 (~164-384, ~221 lines) + its banner.
- **F** (after A,D) delete crude path: geocentricPlanetLongitude, _planetHelioR/_earthHelioR/_earthHelioLon/_vsop87Lon, VSOP87, VSOP87_EARTH_L + exports planetPosition/geocentricPlanetLongitude/VSOP87/VSOP87_EARTH_L; repoint planetLongitude unknown-body fallback to throw. ~540 lines.
- **G** delete nutationLongitude (63-107) + export (no consumer); add comment that positions are apparent-Sun-referenced ~1′.

## DO NOT TOUCH (verified correct)
Sun/Moon/Mercury/Venus/gas-giants; ASC/MC; Placidus/Porphyry geometry; retrograde; the recent ascendant-flip fix, planet routing, house dispatcher. Placidus null→Porphyry circumpolar fallback intended. ASC-MC [60,160] heuristic: |lat|>53° exceptions are correct astronomy — never tighten.

## DEFER
Uniform nutation model; placidusHouses→{system,cusps} shape; chiron/pluto provenance tags; section renumber (final pass); npm index.cjs calls wrong path (separate package).
