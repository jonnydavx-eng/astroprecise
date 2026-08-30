# Source: AstroPrecise project — domain overview

Captured: 2026-06-22
Type: project knowledge (extracted from the repo this vault lives in)
Origin: `astroprecise/CLAUDE.md` + the Kotlin data models under
`app/src/main/java/com/astroprecise/data/model/` and
`domain/astrology/BirthChartCalculator.kt`.

---

## What AstroPrecise is

An astrology product with two front-ends sharing one offline, deterministic
engine: an **Android app** (Kotlin + Jetpack Compose) and a **static website**
(vanilla JS, GitHub Pages). It produces personalised birth charts, daily
horoscopes, and planetary-position data with no API keys and no servers — every
reading is computed locally and deterministically (same input → same output).

## The 12 zodiac signs (from `ZodiacSign.kt`)

Each sign has an element, a modality, and a ruling planet:

| Sign | Symbol | Dates | Element | Modality | Ruler |
|---|---|---|---|---|---|
| Aries | ♈ | Mar 21–Apr 19 | Fire | Cardinal | Mars |
| Taurus | ♉ | Apr 20–May 20 | Earth | Fixed | Venus |
| Gemini | ♊ | May 21–Jun 20 | Air | Mutable | Mercury |
| Cancer | ♋ | Jun 21–Jul 22 | Water | Cardinal | Moon |
| Leo | ♌ | Jul 23–Aug 22 | Fire | Fixed | Sun |
| Virgo | ♍ | Aug 23–Sep 22 | Earth | Mutable | Mercury |
| Libra | ♎ | Sep 23–Oct 22 | Air | Cardinal | Venus |
| Scorpio | ♏ | Oct 23–Nov 21 | Water | Fixed | Pluto |
| Sagittarius | ♐ | Nov 22–Dec 21 | Fire | Mutable | Jupiter |
| Capricorn | ♑ | Dec 22–Jan 19 | Earth | Cardinal | Saturn |
| Aquarius | ♒ | Jan 20–Feb 18 | Air | Fixed | Uranus |
| Pisces | ♓ | Feb 19–Mar 20 | Water | Mutable | Neptune |

- **Elements** (4): Fire, Earth, Air, Water.
- **Modalities** (3): Cardinal (initiating), Fixed (stabilising), Mutable (adapting).

## The planets (from `Planet.kt`)

Ten bodies, each with core keywords:

- Sun ☉ — Identity, Ego, Vitality
- Moon ☽ — Emotions, Intuition, Subconscious
- Mercury ☿ — Communication, Intellect, Travel
- Venus ♀ — Love, Beauty, Harmony
- Mars ♂ — Action, Desire, Energy
- Jupiter ♃ — Expansion, Luck, Wisdom
- Saturn ♄ — Discipline, Karma, Structure
- Uranus ⛢ — Innovation, Rebellion, Change
- Neptune ♆ — Dreams, Illusion, Spirituality
- Pluto ♇ — Transformation, Power, Rebirth

The "classical planets" set includes all ten in the codebase (Sun and Moon are
treated as luminaries but grouped with the planets for charting).

## Aspects (from `BirthChart.kt`)

Angular relationships between two planets, each with a standard orb and nature:

| Aspect | Symbol | Angle | Orb | Nature |
|---|---|---|---|---|
| Conjunction | ☌ | 0° | 8° | Neutral |
| Sextile | ⚹ | 60° | 4° | Harmonious |
| Square | □ | 90° | 8° | Challenging |
| Trine | △ | 120° | 8° | Harmonious |
| Opposition | ☍ | 180° | 8° | Challenging |

These are the **Ptolemaic (major) aspects**.

## Houses

Twelve houses, each governing a life area. AstroPrecise uses the **Whole Sign**
(equal house) system, derived from the Ascendant.

## The Big Three

A chart's headline placements are Sun sign (identity), Moon sign (inner emotional
life), and Rising/Ascendant sign (outward persona) — surfaced as `sunSign`,
`moonSign`, `risingSign` in `BirthChart`.

## How the chart is calculated (`BirthChartCalculator`)

Simplified VSOP87-derived mean elements (~1° accuracy):
1. Julian Day from birth date/time.
2. Solar & lunar longitude via perturbation series.
3. Outer-planet longitudes via mean motion.
4. Ascendant from Local Sidereal Time + latitude.
5. Twelve equal (Whole Sign) houses.
6. Ptolemaic aspects with standard orbs.
