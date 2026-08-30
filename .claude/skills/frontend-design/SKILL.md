---
name: frontend-design
description: Distinctive, intentional visual design for AstroPrecise UI — both the Jetpack Compose app and the vanilla-JS website. Use when building new UI, a new page/screen, or reshaping an existing one. Pushes past templated "AI slop" toward deliberate typography, layout, motion, and a signature element, while respecting AstroPrecise's locked warm-observatory brand.
---

# Frontend Design (AstroPrecise)

> Adapted for this repo from Anthropic's `frontend-design` skill
> (github.com/anthropics/skills). The general method is theirs; the
> AstroPrecise constraints below are what make it ours.

Approach this as the design lead at a small studio whose work could never be
mistaken for anyone else's. Make deliberate, opinionated choices about
typography, layout, and motion that are specific to the brief — and take one
real aesthetic risk you can justify. Generic is the only failure mode.

## What is FIXED here (do not "design" these away)

AstroPrecise already has a brand. These are constraints, not open axes:

- **Palette is LOCKED — "warm observatory" (engraved gold on warm void).**
  The live `:root` in `website/css/main.css`: gold `#C9A227`, gold-light
  `#EFE3C0`, parchment `#E8E0D0`, silver `#A89E88`, oxblood `#6e1a26`, warm
  voids `#050406` / `#0D0A07` / `#13100C`. The app mirrors this in
  `ui/theme/Color.kt`.
  **Never reintroduce the RETIRED cool values** — lapis `#2a4a94`, electric
  violet `rgba(123,44,191,…)`, cyan, `#D4AF37`, void `#090b16`. Spend your
  boldness elsewhere.
- **No framework, no build step (website).** Vanilla HTML/CSS/JS modules
  attached to `window`, one stylesheet. Do not add React/Tailwind/a bundler.
- **Compose + Material 3 (app).** Stateless screens reading a single `UiState`;
  serif display + sans body type scale already defined in `ui/theme/Type.kt`.
- **Honesty rule.** Never fake data. Live feeds get source labels; unavailable
  feeds say so. Hero stats must be true.
- **Determinism.** Same inputs → same output everywhere (FNV-1a / mulberry32).

Because palette and stack are fixed, your design freedom lives in
**typography, spatial structure, motion, and the signature element.** That is
where you earn a distinctive result.

## Ground it in the subject

The subject is the cosmos as an *instrument* — observatory brass, star charts,
ephemerides, light-cones, sidereal time. Distinctive choices come from that
world's materials and vernacular, not from generic "space app" tropes. Before
designing, name the page's single job and state it.

## Design principles

- **The hero is a thesis.** Open with the most characteristic thing in the
  subject's world (the 3D orrery, a live sky, a light-cone), not a big-number +
  gradient-accent template block. Only use the template answer if it is truly
  best.
- **Typography carries the personality.** The repo pairs a serif display with a
  sans body — use the scale with intentional weights, widths, and spacing. Make
  the type treatment itself memorable, not a neutral delivery vehicle.
- **Structure is information.** Numbering, eyebrows, dividers, and labels must
  encode something true (a real sequence, a typed timeline) — not decorate.
  Question `01 / 02 / 03` markers before using them.
- **Motion deliberately.** An orchestrated page-load or scroll-reveal moment
  lands harder than scattered effects. Respect `prefers-reduced-motion`. Extra
  animation is a leading cause of the "AI-generated" feeling — less is often
  more.
- **Match complexity to the vision.** Maximalist needs elaborate execution;
  minimal needs precision in spacing, type, and detail.

## Process: plan → critique → build → critique again

Work in two passes.

1. **Plan a compact design system** for the brief: **Type** (display + body +
   utility roles and their scale), **Layout** (a one-sentence concept + an ASCII
   wireframe), **Motion** (the one orchestrated moment), and **Signature** (the
   single element this page is remembered by). Palette is already given — use it.
2. **Critique the plan against the brief before building.** If any part reads
   like the default you'd produce for any astrology page, revise it and say what
   you changed and why. Only then write code, deriving every type/spacing/motion
   decision from the revised plan.

Watch CSS specificity: type-based (`.section`) and element-based (`.cta`)
selectors easily cancel each other's padding/margins. Do most iteration in
thinking; show the user only higher-confidence ideas.

## Restraint and self-critique

Spend your boldness in one place — let the signature element be the one
memorable thing and keep everything around it quiet. Build to a quality floor
without announcing it: responsive to mobile, visible keyboard focus, reduced
motion respected. Critique as you build; take a screenshot if you can — a
picture is worth 1000 tokens. Chanel's rule: before shipping, remove one
accessory.

## Writing is design material

Copy can make a design feel as templated as the layout. Write from the user's
side of the screen: name things by what people control ("Save chart," not
"Submit"), keep an action's name consistent through its whole flow, use active
voice and sentence case. Treat errors and empty states as direction, not mood:
say what happened and how to fix it, in the interface's voice. Each element does
exactly one job.
