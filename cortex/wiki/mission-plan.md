# Cortex Mission Plan — Active

*Last updated: 2026-07-02. This is the standing plan the Cortex works from; update it
as missions complete (move them to log.md with proof) or priorities change.*

## Mission 1 — Hub bootstrap ✅ (this PR, #6)

Hub created (`cortex/` + workers), first lint pass done. Remaining step is owner-side:
**merge PR #6** so every future session inherits the hub from `main`.

## Mission 2 — Repair the instruction layer ✅ (this PR, #6)

CLAUDE.md is the first file every session reads; two of its sections were actively
wrong. Fixed in this PR, facts verified against the repo:
- Deployment section rewritten: automated gh-pages Actions pipeline (test gates →
  minified `dist/` → publish), live at `https://astroprecise.app`. Manual mirroring
  is retired — the old instructions would have caused a hand-push over the built site.
- Palette section rewritten: live tokens are `ap-palette-2026.css` cool-void + brass
  (`#0C1016` / `#C2A05E`); both the original cool set AND the 2026-06-14 warm set are
  retired. Rule added: use `--ap-*` tokens, never hardcode hex; DESIGN.md is normative.

## Mission 3 — STATUS.md refresh (open, small)

STATUS.md says ap-v563; `main` is at ap-v566 (v564 Weekly Sky + minified deploys,
v565 PayPal direct, v566 PayPal e2e gate + honest shop copy). Refresh the snapshot on
the next mission that touches the site, or as a standalone quick fix. Owner tasks
listed in STATUS.md §Open still stand (GSC/Bing, social + Postiz, PayPal smoke-test).

## Mission 4 — Phase-1 traction support (open, owner-gated)

The business plan (see [astroprecise-business.md](astroprecise-business.md)) is
blocked on owner actions, not code: PayPal links pasted into `app.js AP_MON`, social
accounts + Postiz. Cortex can prepare but not complete these. When unblocked, likely
work: launch-week content support from CONTENT-CALENDAR.md, conversion checks.

## Mission 5 — Satellite dashboard (open, undefined)

`davit_sat_dashboard.py` is a blank Streamlit template. Awaiting a mission brief from
the owner; treat as greenfield. See [davit-sat-dashboard.md](davit-sat-dashboard.md).

## Mission 6 — Palette token hygiene sweep (open, small-medium)

The verifier found warm hexes (`#050406`, `#C9A227`) hardcoded as canvas/WebGL/SVG
paint colors in shipped JS on chart, ephemeris, and compatibility pages (full list in
[index.md](../index.md) lint finding 2). Decide with owner whether these are
intentional render aesthetics or leftovers; if leftovers, sweep them to `--ap-*`
token reads (canvas can read tokens via `getComputedStyle`). Visual QA required —
these change pixels on flagship pages. Bump `sw.js` cache if shipped.

## Standing orders

- Query the wiki before complex work; ingest after significant missions.
- Delegate catalog/verify work to `scout`/`verifier`; leader owns synthesis and edits
  to instruction-layer files (CLAUDE.md, DESIGN.md).
- Every completed mission gets a log.md entry with a proof artifact.
