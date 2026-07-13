# Cortex Mission Plan — Active

*Last updated: 2026-07-13. Standing plan the Cortex works from; update as missions
complete (log.md with proof) or priorities change.*

## Current tip (authoritative)

- **ap-v721** LIVE — tip SHA `6fed17d`
- Focus: Personal Sky Moment + ship-harden
- Checkout: dormant
- Site: https://astroprecise.app · local :8790

Older mission text that says “main is at ap-v566” or “STATUS at 563” is **historical**
only — see Mission 3 below.

## Mission 1 — Hub bootstrap ✅ (this PR, #6)

Hub created (`cortex/` + workers), first lint pass done. Remaining step is owner-side:
**merge PR #6** so every future session inherits the hub from `main` (if not already merged).

## Mission 2 — Repair the instruction layer ✅ (this PR, #6)

CLAUDE.md deployment + palette sections rewritten to Actions Pages deploy and cool-void
+ brass tokens. Normative: use `--ap-*`; DESIGN.md for palette.

## Mission 3 — STATUS / tip refresh ✅ (historical → current)

**Historical (2026-07-02):** STATUS/cortex said ap-v563 while main was at ap-v566
(v564 Weekly Sky + minified deploys, v565 PayPal direct, v566 PayPal e2e + honest shop).

**Current (2026-07-13):** cortex snapshots updated to **ap-v721** (`6fed17d`). Keep
STATUS.md / handoff / cortex aligned on the next site-touching mission if any still lag.

## Mission 4 — Phase-1 traction support (open, owner-gated)

The business plan (see [astroprecise-business.md](astroprecise-business.md)) is
blocked on owner actions, not code: PayPal links / shop re-arm when desired, social
accounts + Postiz. Checkout remains **dormant** until owner re-arms. Cortex can prepare
but not complete these.

## Mission 5 — Satellite dashboard (open, undefined)

`davit_sat_dashboard.py` is a blank Streamlit template. Awaiting a mission brief from
the owner; treat as greenfield. See [davit-sat-dashboard.md](davit-sat-dashboard.md).

## Mission 6 — Palette token hygiene sweep (open, small-medium)

Warm hexes (`#050406`, `#C9A227`) may still be hardcoded as canvas/WebGL/SVG paint
in shipped JS (see [index.md](../index.md) lint finding). Owner call: intentional
aesthetics or leftovers? Visual QA required if sweeping. Bump `sw.js` cache if shipped.

## Mission 7 — Mission Control v2 ✅ (2026-07-03)

`cortex/state.js` shared brain; `mission-control.html` dashboard; `agents.md` wiring.
Keep `state.js` in sync with this page — narrative here, dashboard from state.js.

## Standing orders

- Query the wiki before complex work; ingest after significant missions.
- Delegate catalog/verify work to `scout`/`verifier`; leader owns synthesis and edits
  to instruction-layer files (CLAUDE.md, DESIGN.md).
- Every completed mission gets a log.md entry with a proof artifact.
- Do not claim tip versions older than **ap-v721** without re-verifying git/live.
