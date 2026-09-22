---
created: 2026-06-22
updated: 2026-06-22
tags: [topic/astrology, topic/astroprecise, type/method, status/grown]
source: raw/2026-06-22-astroprecise-overview.md
aliases: [BirthChartCalculator, chart algorithm]
---

# Birth chart calculator

The **`BirthChartCalculator`** is [[astroprecise|AstroPrecise's]] engine for
turning a birth date, time, and place into a [[birth-chart]]. It uses simplified
**VSOP87-derived mean elements**, accurate to about **1°** — enough for
sign/house placement without an ephemeris file.

## Detail

The pipeline:

1. **Julian Day** from the birth date/time (the astronomy time standard).
2. **Solar & lunar longitude** via perturbation series.
3. **Outer-planet longitudes** via mean motion.
4. **[[ascendant|Ascendant]]** from Local Sidereal Time + latitude.
5. **Twelve [[astrological-houses|houses]]** using the Whole Sign system.
6. **[[aspects|Ptolemaic aspects]]** with standard orbs.

It runs on `Dispatchers.Default` (CPU-bound) and needs no network or API keys —
consistent with AstroPrecise's offline, deterministic design. The website
mirrors this with a fuller VSOP87/ELP2000 engine (`ephemeris.js`).

## Connections

- Produces the [[birth-chart]].
- Computes the [[ascendant]], [[astrological-houses]], and [[aspects]].
- Embodies [[astroprecise]]'s offline-deterministic principle.

## Source

`raw/2026-06-22-astroprecise-overview.md` — `BirthChartCalculator` section of
`astroprecise/CLAUDE.md`.
