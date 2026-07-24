---
name: algorithmic-art
description: Generative/algorithmic art via p5.js, delivered as a self-contained interactive HTML artifact with seed navigation, parameter sliders, and a download button. Use when asked to create generative art, a procedural visual, an animated cosmic pattern, or an explorable sketch for AstroPrecise. Honors the repo's determinism and warm-observatory palette.
---

# Algorithmic Art (AstroPrecise)

> Adapted for this repo from Anthropic's `algorithmic-art` skill
> (github.com/anthropics/skills). Method theirs; the integration rules and
> palette are ours.

Generative art is a *living algorithm*, not a randomized template. Each seed
reveals a different facet of one coherent system. Build it as a self-contained,
interactive p5.js artifact someone can tune in real time.

## Integration rules for this repo (read first)

- **Standalone artifacts only — do NOT wire p5.js into the shipped site.** The
  production site is vanilla, no framework, no build step, with a fixed module
  load order (`website/js/`). p5.js is a CDN dependency and must NOT be added to
  the shipped pages or `sw.js` precache. Deliver each piece as a **single
  self-contained HTML file** (p5 from CDN inside that file). Keep them under
  `website/sketches/` (or hand them over as a standalone artifact). If a sketch
  graduates into a shipped page, it gets *re-implemented* in vanilla canvas to
  match the existing `orrery3d.js` / `ZodiacWheel` approach.
- **Determinism is mandatory.** Always seed. Match the repo convention —
  FNV-1a / mulberry32 — so the same seed reproduces the same frame everywhere.
  Expose the seed in the UI.
- **Warm-observatory palette by default.** gold `#C9A227`, gold-light
  `#EFE3C0`, parchment `#E8E0D0`, silver `#A89E88`, oxblood `#6e1a26` on warm
  voids `#050406` / `#0D0A07` / `#13100C`. Never the retired cool values. Offer
  a color picker only if the brief wants palette exploration.
- **Honesty rule still applies.** If a sketch claims to render real sky / real
  ephemeris data, it must actually use it (or label itself as decorative).

## Phase 1 — Algorithmic philosophy (write this first)

Before any code, write a short manifesto (4–6 paragraphs) naming the generative
aesthetic as a *computational worldview*. Describe how it manifests through
process — noise fields, particle behaviors, emergent structure, temporal
evolution — rather than listing shapes to draw. Be specific about direction but
leave room for interpretive implementation choices. Ground it in AstroPrecise's
subject: orbital resonance, precession, sidereal drift, light-cones, star
fields. Aim for something that reads as if crafted by someone at the top of
generative art.

## Phase 2 — p5.js implementation

Express the philosophy in code:

- **Seeded randomness** via `randomSeed()` / `noiseSeed()` (or the repo's
  mulberry32) so every seed is reproducible.
- **Parametric controls** that reflect the philosophy's real levers — particle
  counts, field scale, thresholds, evolution speed — not arbitrary knobs.
- **Required UI** in the artifact:
  - Seed display with **prev / next / random / jump-to** controls.
  - Parameter **sliders** for the meaningful levers.
  - **Regenerate / Reset / Download (PNG)** buttons.
  - Optional color picker (default to the warm palette).
- **Self-contained**: works immediately in a browser from one HTML file, p5.js
  from CDN, no other external dependencies, no network calls.

## Craftsmanship bar

Balance complexity without visual noise; order without rigidity. Treat
randomness as controlled chaos refined by taste — tune ranges so that *every*
seed in the navigable space looks intentional, not just the lucky ones. Embed
quiet references to the astronomy so people who know the subject recognize the
intent.
