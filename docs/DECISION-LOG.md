# Decision log — AstroPrecise Observatory Core

**S1 (Jonny) only approves.** Agents may draft; they must not invent approvals.

| Field | Content |
|-------|---------|
| **ID** | `DEC-YYYY-MM-DD-##` |
| **Title** | … |
| **Context** | … |
| **Options** | A / B / C |
| **Recommendation** | Seat + reason |
| **Owner decision** | Approve / Reject / Defer |
| **Effective** | Immediate / next tip / Gate M |
| **Handoff** | Y/N |

---

## Open (need S1)

| ID | Title | Recommendation | Blocks |
|----|-------|----------------|--------|
| **DEC-2026-08-06-02** | Ephemeris: stay on Meeus, do not adopt Swiss Ephemeris / sweph-wasm | **Reject the swap** — AGPL trap, see detail below | Any "upgrade the ephemeris" work |
| **DEC-2026-08-06-01** | Rewrite the site on Next.js + React-Three-Fiber | **Reject the rewrite** — see detail below | Any framework-migration proposal |
| **DEC-2026-07-13-01** | Permanent seats S1–S12 structure | **Approve** (doctrine already locked) | Formal continuity only |
| **DEC-2026-07-13-02** | CD path: studio retainer vs freelancers | Hybrid: fractional CD + lighting TD; or studio days for M1 | Big Phase M craft |
| **DEC-2026-07-13-03** | Year-1 budget band lean / mid / studio | **Mid** planning (~$700k) unless you want lean agent-only | Retainers |
| **DEC-2026-07-13-04** | Scale ladder sticky vs honest non-sticky | Spike after Gate M; until then don’t market sticky | Marketing claims |
| **DEC-2026-07-13-05** | Single-click focus+panel vs double-tap fly | Match **current code** + fix copy (document during Phase 0) | UX polish |
| **DEC-2026-07-13-06** | Home brass CTA exception vs aurora sitewide | Defer to Phase S; document exception | Token polish |
| **DEC-2026-07-13-07** | Open OrbitLab free-explore | **Defer / blocked** | Phase E |
| **DEC-2026-07-13-08** | Paste commerce / deepReadingUrl | **Defer** (dormant-honest) | Revenue |
| **DEC-2026-07-13-09** | Phase 0 execute approved | **Approve** — agents start A1–A6 | Nothing if already implied |

## Resolved

| ID | Decision | Date |
|----|----------|------|
| — | *(none yet)* | |

---

## Detail — entries added 2026-08-08

*Harvested from Kimi's `plan-review-core-innovation-vs-astroprecise.md` (Kimi CLI
@ BOOK-T1H4NJ753R, 2026-08-06), a review of an external "Core Innovation"
strategy doc against the site as built. Imported 2026-08-08 by Claude @
BOOK-T1H4NJ753R. **The source document was deliberately not imported wholesale**
— see the correction at the end of DEC-2026-08-06-02.*

### DEC-2026-08-06-01 — Reject the Next.js / React-Three-Fiber rewrite

| Field | Content |
|-------|---------|
| **ID** | `DEC-2026-08-06-01` |
| **Title** | Rewrite the site on Next.js + React-Three-Fiber (+ drei, Zustand, D3) |
| **Context** | An external strategy doc proposed rebuilding AstroPrecise on a modern React stack as the route to a "next-gen" 3D astrology product. |
| **Options** | A: full rewrite on Next.js/R3F · B: keep the zero-dependency static PWA and invest in the engine · C: hybrid (React for new surfaces only) |
| **Recommendation** | **B — reject the rewrite.** The proposal is a framework-faith rebuild of things that already work: a zero-dependency static PWA with a ~399-entry offline precache, GitHub Pages deploy with minify, 0.2s asset responses; hand-rolled 2D SVG wheels; event-based 2D↔3D state sync (`planetfocus` / `scalechange` / flyTo wiring); 60fps-tiered perf with graceful WebGL context-loss handling. That is the discipline their stack *aims at*, already shipping. The rewrite would have cost the eclipse campaign (5 days at the time of review) and months of hardened lifecycle code for zero user-visible gain. Their D3 / Zustand / R3F layers solve problems this project does not have. |
| **Owner decision** | *Pending S1* |
| **Effective** | On signature; treat as standing guidance meanwhile |
| **Handoff** | Y — quote this row at any future "should we move to React?" proposal |

**Worth taking from the same doc** (recorded so the rejection is not read as
rejecting everything): the birth-place + IANA-DST pipeline, client-side 3D
video/GIF export, and a public "check our maths" debug panel. Those are the real
gifts; none of them needs a rewrite.

### DEC-2026-08-06-02 — Ephemeris stays on Meeus; Swiss Ephemeris is an AGPL trap

| Field | Content |
|-------|---------|
| **ID** | `DEC-2026-08-06-02` |
| **Title** | Do not adopt Swiss Ephemeris (`sweph` / `sweph-wasm`) |
| **Context** | The same strategy doc recommended a WASM Swiss Ephemeris / DE441 kernel as a precision and credibility upgrade over the current pure-JS Meeus-series implementation. It never mentioned the licence. |
| **Options** | A: adopt sweph-wasm and open-source the whole app · B: adopt it and buy an Astrodienst commercial licence · C: stay on Meeus |
| **Recommendation** | **C — stay on Meeus.** Swiss Ephemeris is dual-licensed **AGPL or commercial**. A web app that ships it must either open-source the *entire* application under AGPL, or buy a commercial licence from Astrodienst. Neither is free, and the AGPL option would forcibly open-source the paid readings engine. The current VSOP87 / ELP2000 Meeus-series implementation (`website/js/ephemeris.js`) carries no such restriction, computes on-device in pure JS, and is arcminute-class — a full cast runs in under ~10ms. The accuracy gain is not the point either: birth-time uncertainty dwarfs the engine difference for every chart a customer will ever enter. **If this is ever revisited, budget the licence explicitly before writing a line of code.** |
| **Owner decision** | *Pending S1* |
| **Effective** | On signature; treat as standing guidance meanwhile |
| **Handoff** | Y — this is a legal exposure, not a preference |

**⚠️ Correction to the source, and the reason it was not imported wholesale.**
`plan-review-core-innovation-vs-astroprecise.md` §1 states the site has **"No house
engine at all"** and calls it "our single biggest product gap". **That is false.**
Measured 2026-08-08, `website/js/ephemeris.js` implements three house systems:

- **Placidus by semi-arc**, solved iteratively — `placidusCusps()` at line 159, with
  the method documented at lines 154–158 and a `null` return for the circumpolar case
- **Porphyry** quadrant trisection — `porphyryCusps()` at line 184, the documented
  robust fallback when Placidus is circumpolar
- **Equal house** from the Ascendant — `equalCusps()` at line 197, the polar degrade path

There is also a degradation ladder for high latitude (lines ~202–223) and a
documented fallback of Koch and other unsupported systems to Placidus (line ~227).
`test-engine-houses.mjs` is a dedicated regression suite for this code.

The *real* gap the source was reaching for is narrower and is genuinely open: the
site takes **no birth place on the homepage**, so it cannot compute the Ascendant
there and honestly prints "RISING — NEEDS A PLACE". Houses are implemented; the
place-and-timezone pipeline that feeds them is not. Related and also real: the
timezone inputs are **fixed-offset dropdowns with no DST history**
(`website/index.html` line 351, nine options; `website/eclipse.html` lines 141–143,
seven options), so a UK summer birth entered as "UT / GMT" is cast an hour out.

---

*Append new rows at top of Open or move to Resolved when signed.*
