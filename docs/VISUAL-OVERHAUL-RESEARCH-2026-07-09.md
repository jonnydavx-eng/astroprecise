# Visual overhaul research — Astro Precise (2026-07-09)

## Competitive / category patterns

| Product | Layout idea | Color language | Takeaway for AP |
|---------|-------------|----------------|-----------------|
| **NASA Eyes** | Full-stage 3D; UI docked as thin overlays; can hide chrome for pristine view | Deep blue-black void, white data labels, cool instrument accents | **Model is the product.** Chrome is secondary glass. |
| **Stellarium Web** | Full-viewport sky; sparse toolbar; scrub time; night mode | Near-black sky, minimal UI, red night mode optional | Sparse UI, sky fills frame; no marketing-slab chrome. |
| **Explore Universe / planet photo sites** | Large planet is the page; type rides glass | Dark + photography | Engine stills = stage language on non-WebGL pages. |
| **Premium dark SaaS** | Hero visual owns center; forms as floating cards | Cool neutrals + one accent | Glass form panel left; orrery owns right/center. |

Sources studied: NASA Eyes on the Solar System (eyes.nasa.gov), Stellarium Web UI patterns, prior AP design-target captures.

## Diagnosis of previous AP look

1. **Warm brass + cream everywhere** flattened hierarchy (accent = body color).
2. **Form-left / small orrery-right** felt like a marketing site with a widget, not an instrument.
3. **Inner pages** were flat void + warm cards; the 3D model was absent from the *layout language*.
4. **Competing type systems** (Cormorant body, Georgia shop, 10px labels).
5. **Terracotta CTAs** fought the cool solar-system stage.

## Direction: “Instrument stage”

- **Stage** = deep indigo space (cool, not brown-black).
- **Model** = center of gravity (home orrery larger ~78vh; explore full stage; inner pages use engine stills + cyan stage glow).
- **UI** = glass panels floating on the stage (blur + ice rim).
- **Accent** = **atmosphere cyan** (Earth limb) + **sun-gold** only for prices/seals.
- **CTA** = cool **aurora blue** (distinct from brass).

## Palette (canonical — `ap-palette-2026.css`)

| Token | Hex | Role |
|-------|-----|------|
| void-deep | `#050810` | Page canvas |
| void-mid | `#0B1220` | Sections |
| void-raised | `#152038` | Cards |
| starlight | `#E8EEF8` | Primary text |
| mist | `#B8C4D8` | Secondary text |
| muted | `#8A98B0` | UI labels |
| cyan | `#5EC8E8` | Instrument accent / links / active nav |
| sun-gold | `#E0C070` | Rare highlight / seals / prices |
| cta | `#3D8BFF` | Primary actions |

## Layers shipped (ap-v664)

| File | Role |
|------|------|
| `css/ap-palette-2026.css` | Cool tokens + legacy aliases (`--brass` → gold-core for seals only) |
| `css/ap-model-stage.css` | Layout: larger home orrery, glass hero/form, glass header/footer/nav, stage glows, engine strip cyan |
| `css/ap-visual-clarity.css` | Type hierarchy, card lift, form contrast, CTA aurora |
| `css/ap-site-polish.css` | Terracotta removed → aurora; cool body ink |

Injected sitewide via `app.js` + `ap-page-boot.js` (palette → clarity → model-stage). Linked eagerly on `index.html` + `mysky.html`.

## Constraints (do not break)

- One ESM Three stack (home/explore only). No UMD `three.min` on production pages.
- Tools & forms stay functional.
- WCAG: starlight on void-deep; cyan links on void (contrast check after paint).
- Engine strip mounts last in `main`, never inside hidden ancestors.

## Hard-refresh checklist

1. Home: cool void, large orrery, glass copy panel, cyan live pill, aurora Cast CTA.
2. Chart / Daily / Shop: cool cards, cyan rims, engine strip at page end, no dual Three.
3. My Sky: glass cards + cinema still, no second WebGL.
4. SW: `ap-v664`.
