# Observatory Visual Wave — 2026-08-17 (owner GO)

**Law:** Option 2 — major sky / model / structure polish **on top of** existing `orrery-webgl.js` + Keep path. No React. No rewrite from scratch. No push until Jonny says. No new SKUs.

**Why this palette (expert call — not the stock “creative agency” cream/red kit):**  
UI search defaults wanted cream + red blocks (wrong product). Frontend-design skill: ground in subject (observatory instrument), avoid AI clusters (cream+terracotta, purple glow, acid green). Move **off** blackened-brass fatigue toward **cool lunar night + instrument silver**, with one warm copper CTA only.

## Locked tokens (edit `website/css/ap-palette-2026.css` — no raw hex in new page CSS)

| Role | Token | Hex | Job |
|---|---|---|---|
| Void deep | `--ap-void` / `--ap-void-deep` | `#05080F` | Full-bleed night behind WebGL |
| Void mid | `--ap-void-mid` | `#0C1422` | Bands / panels |
| Raised glass | `--ap-void-raised` | `#141E2E` | HUD plates |
| Soft raised | `--ap-void-soft` | `#1A2538` | Hover lift |
| Paper | `--ap-paper` | `#E6ECF2` | Primary text (cool, not cream) |
| Mute | `--ap-mute` / text secondary | `#8A97A8` | Captions |
| Instrument silver | `--ap-brass` **rebind** | `#8FA3B8` | Hairlines, labels (name stays for compat) |
| Silver bright | `--ap-brass-bright` | `#C5D4E0` | Focus / hover metal |
| Copper CTA | `--ap-ember` / `--ap-cta` | `#B86B4A` | Primary buttons only |
| Proof / live ok | `--ap-proof` | `#7EB8A8` | Honest LIVE when earned |
| theme-color | meta + manifest | `#05080F` | Match void |

**Retired for this wave (do not put back):** warm brass `#d8b46a` / `#C2A05E` as chrome accent, void `#020307` as house night, parchment cream `#F2ECDF` / `#ECE6D8` as primary paper, neon cyan/violet.

**Typography:** keep Cormorant (display) + Schibsted Grotesk (UI). Do **not** switch to Nunito/DM Sans.

**Signature:** full-viewport model is the product; glass HUD (System · Inner · Earth) sits beside/below — never on the canvas; Keep path unchanged in behaviour.

## Agent split (non-overlapping)

### F — Palette + chrome
- Rewrite token values in `ap-palette-2026.css` (+ aliases so `--ap-gold-*` / living-sky maps follow).
- `theme-color` / `manifest.json` → `#05080F`.
- Major home/chart chrome CSS that still hardcodes old brass/void — migrate to tokens.
- Tip **ap-v880**. Tests that pin colours/tips updated.
- Forbidden: React, orrery camera rewrite, shop SKUs, delete Keep path.

### G — Home structure + glass HUD
- `index.html` + `ap-home-v835.css` / living-sky: one composition — brand + short line + dominant WebGL; controls as glass plate.
- House language System / Inner / Earth (existing control model) — clearer hierarchy, less dashboard clutter in first viewport.
- Phone 390: stage survives; 44×44 taps; no overlay stealing canvas pointers.
- Keep `#keep-sky` / `ap-home-keep.js` working.
- Tip bump with F if shared assets; coordinate **ap-v880**.
- Forbidden: React, second WebGL, invent SKUs.

### H — Model / sky feel (same engine)
- `orrery-webgl.js` (+ adapter only if needed): fog/clear color → new void; lighting so planets read on cool night; Earth mark stronger for birth-hour still; tighten elevation in **drag handlers** (not only `clampCamToLevel` radius).
- Do **not** delete `applyAuthoredBirthHourStill` — improve it.
- Honesty: no fake LIVE; Surface A stills stay SCHEMATIC.
- Tip **ap-v880**. `npm test` green.
- Forbidden: React, Three rewrite from scratch, new npm deps, shop.

## Fold / ship
Local fold only. Preview `:8790/?nosw=1`. Owner looks. Push only on owner command.
