---
created: 2026-06-22
updated: 2026-06-22
tags: [topic/astrology, topic/astroprecise, type/concept, status/grown]
source: raw/2026-06-22-astroprecise-overview.md
aliases: [AstroPrecise]
---

# AstroPrecise

**AstroPrecise** is an astrology product with two front-ends over one shared
engine: an **Android app** (Kotlin + Jetpack Compose) and a **static website**
(vanilla JS on GitHub Pages). It produces personalised [[birth-chart|birth
charts]], daily horoscopes, and planetary positions — all computed **offline and
deterministically** (same input always yields the same reading), with no API keys
or servers.

## Detail

- **Determinism** is a core design rule: readings are seeded so identical inputs
  reproduce identical output everywhere (the horoscope generator seeds on
  `sign.ordinal * 31 + epochDay`).
- **Privacy:** everything computes in-browser / on-device; the only outbound
  calls are labelled public feeds and place-search geocoding.
- **Honesty rule:** never fake data — live feeds are labelled, unavailable feeds
  say so.

The astrology domain it models is captured in linked notes below.

## Connections

- Computes the [[birth-chart]] via the [[birth-chart-calculator]].
- Models the [[zodiac-sign|12 zodiac signs]], [[the-planets]],
  [[astrological-houses]], and [[aspects]].
- This vault ([[second-brain]]) lives inside the AstroPrecise repo so it can
  accumulate knowledge about this subject.

## Source

`raw/2026-06-22-astroprecise-overview.md`, extracted from `astroprecise/CLAUDE.md`
and the app's Kotlin data models.
