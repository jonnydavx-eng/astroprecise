---
created: 2026-06-22
updated: 2026-06-22
tags: [topic/astrology, type/concept, status/grown]
source: raw/2026-06-22-astroprecise-overview.md
aliases: [natal chart, birth chart]
---

# Birth chart

A **birth chart** (natal chart) is a snapshot of the sky at the exact moment and
place of a person's birth. It places the [[the-planets|planets]] into
[[zodiac-sign|signs]] and [[astrological-houses|houses]], and records the
[[aspects]] between them. It's the central artefact [[astroprecise]] produces.

## Detail

In the codebase a chart is `BirthChart(sunSign, moonSign, risingSign, planets,
houses, aspects)`. Its headline placements are the **Big Three**:

- **Sun sign** — core identity (the familiar "star sign" from your birthday).
- **Moon sign** — inner emotional life, instincts.
- **Rising / [[ascendant]] sign** — outward persona; the sign on the eastern
  horizon at birth.

Because the Rising sign depends on the exact birth *time and place* (not just the
date), an accurate chart needs all three.

## Connections

- Built by the [[birth-chart-calculator]].
- Composed of [[the-planets]] in [[zodiac-sign|signs]] and
  [[astrological-houses|houses]], related by [[aspects]].
- The [[ascendant]] anchors the house layout.

## Source

`raw/2026-06-22-astroprecise-overview.md` — `BirthChart.kt`.
