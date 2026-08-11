# AstroPrecise design system — launch master

**Direction:** a blackened astronomical field instrument and contemporary
ephemeris journal. This is not a generic space site, luxury-store template or
rounded bento dashboard. The live sky model is the one visual signature.

## Non-negotiable hierarchy

1. The home Observatory owns the full live orrery.
2. Eclipse owns one dedicated Sun–Moon–Earth shadow instrument because it
   performs a different scientific task.
3. Other pages may link to the Observatory or show clearly labelled editorial
   artwork; they never imitate a live model or display a false `LIVE` state.
4. Every route uses the same masthead, bottom navigation, palette, typography,
   control geometry and compact footer.

## Palette

| Role | Value | Rule |
| --- | --- | --- |
| Deep void | `#020307` | Page ground |
| Void | `#05070B` | Primary surface |
| Raised void | `#0D121B` | Instrument plates |
| Paper | `#F2ECDF` | Primary copy |
| Aged brass | `#D8B46A` | Datum lines, labels, links |
| Ember | `#FF6428` | Events, live state, one decisive action |
| Proof | `#A8D6B0` | Verified/computed status only |
| Telemetry silver | `#B9C8DC` | Coordinates and secondary data |

No cyan, teal, burgundy or decorative purple in interface chrome. Physically
truthful planetary colour remains inside WebGL. Umbra violet is exclusive to
the eclipse renderer.

## Typography

- `Cormorant Garamond`, italic 500: one principal thesis per page; no other
  large decorative statements.
- `Schibsted Grotesk`: body, labels, controls and explanatory copy.
- `IBM Plex Mono`: UTC, coordinates, prices, evidence and instrument states.
- `Cinzel`: edition marks and plate numbers only.
- Mobile body copy is at least 16px; meaningful utility text is at least 12px.
- Long copy stays within 65–72 characters per line.

## Geometry and spacing

- Corners are engraved: 3–6px for controls and 8–12px for large plates.
- Pills are reserved for state, filters and `LIVE`; primary actions are not
  capsules.
- Use an 8px rhythm: 8, 16, 24, 32, 48, 64 and 80px.
- Shared desktop content width: 1180px. Mobile gutter: 16px minimum.
- Below-model sections use 48–80px vertical padding, never 120px catalog gaps.
- Hairlines are brass at 18% or 36%; shadows are black depth, never neon glow.

## Component grammar

- One primary action per view. Ember denotes that action; secondary actions
  are transparent with a brass hairline.
- Controls have at least a 44×44px interactive area and stable hover/pressed
  states that do not move surrounding layout.
- Cards exist only when content is independently actionable. Related facts use
  an engraved ledger with ruled rows instead of generic feature cards.
- Product imagery uses one grammar: quiet void or natural field, technical
  datum line, restrained brass annotation and at most one ember event marker.
- Renderer stills are labelled `SCHEMATIC`; generated natal charts are labelled
  editorial and never presented as computed proof.

## Motion

- The orrery provides the spectacle. Site UI motion is subordinate.
- Micro-interactions: 180–280ms, opacity or transform only, ease-out on entry.
- No bounce, back-easing, decorative parallax or mass card stagger.
- Content replacement crossfades in place; state changes never flash between
  two renderers.
- `prefers-reduced-motion` disables non-essential movement while preserving all
  information and controls.

## Route shape

- **Home:** live Observatory → compact personal entry → three-row current
  edition → concise computation/privacy proof → compact footer.
- **Chart:** asymmetric thesis + birth-data instrument → result → one
  three-row explanatory specification.
- **Daily:** concise thesis → 6×2 sign ledger (2 columns on phone) → selected
  readout → honest generic-reading note → collapsed sky-weather ledger.
- **Eclipse:** live shadow instrument near the top → local result → tomorrow’s
  visibility/watch/safety guide → inset computed-geometry schematic.
- **Shop:** honest preview state → 7/5 lead products → three-item ledger →
  three-row delivery/proof explanation. No checkout urgency without checkout.

## Shared footer

Maximum 260px desktop and 320px phone: wordmark, one honest sentence, four core
routes and Privacy / Refunds / Verify. No zodiac directory, sign strip,
affiliate shelf, duplicated catalogue or SEO sitemap wall.

## Launch checklist

- One palette and type hierarchy on every key route.
- No emoji as structural icons; use the existing SVG icon grammar.
- Visible focus states and sequential headings.
- No horizontal scroll at 375px; fixed navigation reserves its safe area.
- Images declare dimensions and use WebP/AVIF where practical.
- One WebGL context per page; no fake live badges.
- No false commerce, privacy, astronomical or availability claims.
- Consolidated review at 375, 390, 768, 1024 and 1440px; reduced motion; keyboard;
  renderer focus for all planets; service-worker upgrade path.
