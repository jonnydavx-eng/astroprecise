# docs/ — AstroPrecise documentation index · 2026-07-13

Agent-facing map of this folder. Prefer tip-of-tree truth over dated snapshots.

## Start here (ACTIVE)

| Doc | Role |
|---|---|
| [`../STATUS.md`](../STATUS.md) | **Tip truth** — live ship state, cache tip (`ap-v###`), what is deployed |
| [`UPGRADE-REFINE-PLAN-2026-07-13.md`](UPGRADE-REFINE-PLAN-2026-07-13.md) | **Extensive upgrade program** — Tracks A–D (start here for next work) |
| [`REGRESSION-AUDIT-2026-07-13.md`](REGRESSION-AUDIT-2026-07-13.md) | 20-agent regression scoreboard + P0/P1 list |
| [`FORWARD-PLAN.md`](FORWARD-PLAN.md) | Short forward options (links to extensive plan) |
| [`MODEL-SURFACE-CONTRACT.md`](MODEL-SURFACE-CONTRACT.md) | 3D model surface contract (binding UX/engine rules) |
| [`../HANDOFF.md`](../HANDOFF.md) | Project handoff summary |
| [`UI-UX-SYSTEM-BRIEF-2026-07-11.md`](UI-UX-SYSTEM-BRIEF-2026-07-11.md) | UI/UX system brief (current design system snapshot) |

Also useful at repo root (outside this folder): `AGENTS.md`, `AGENT-HANDOFF.md`, `DESIGN.md`, `website/AGENTS.md`.

## Product / spatial backlog (REFERENCE — not current law)

Plans and specs that informed the observatory / model / homepage work. Use for intent and backlog ideas; **do not treat as shipping status**.

| Doc | Topic |
|---|---|
| [`SPATIAL-OBSERVATORY-PLAN-2026-07-11.md`](SPATIAL-OBSERVATORY-PLAN-2026-07-11.md) | Spatial observatory plan |
| [`OBSERVATORY-LOOK-THROUGH-2026-07-11.md`](OBSERVATORY-LOOK-THROUGH-2026-07-11.md) | Look-through / camera narrative |
| [`OBSERVATORY-HOMEPAGE-DESIGN-2026-07-10.md`](OBSERVATORY-HOMEPAGE-DESIGN-2026-07-10.md) | Observatory homepage design |
| [`ORBITLAB-INTEGRATION-MASTERPLAN-2026-07-09.md`](ORBITLAB-INTEGRATION-MASTERPLAN-2026-07-09.md) | OrbitLab integration masterplan |
| [`MODEL-MASTERPIECE-SPEC-2026-07-10.md`](MODEL-MASTERPIECE-SPEC-2026-07-10.md) | 3D model masterpiece spec |
| [`MODEL-CENTERED-STRUCTURE-2026-07-09.md`](MODEL-CENTERED-STRUCTURE-2026-07-09.md) | Model-centered site structure |
| [`ALL-PAGES-IMPROVEMENT-PLAN-2026-07-10.md`](ALL-PAGES-IMPROVEMENT-PLAN-2026-07-10.md) | Cross-page improvement plan |
| [`WOW-HOMEPAGE-PLAN-2026-07-10.md`](WOW-HOMEPAGE-PLAN-2026-07-10.md) | Homepage “wow” plan |
| [`STRUCTURE-CLEAN-2026-07-10.md`](STRUCTURE-CLEAN-2026-07-10.md) | Structure cleanup notes |
| [`SITE-OVERHAUL-JET-SILVER-AURORA-PLAN-2026-07-09.md`](SITE-OVERHAUL-JET-SILVER-AURORA-PLAN-2026-07-09.md) | Jet / silver / aurora visual overhaul plan |
| [`WORLDCLASS-UPGRADE-2026-07-09.md`](WORLDCLASS-UPGRADE-2026-07-09.md) | World-class upgrade pass |
| [`DESIGN-PANEL-CHART-MASTERPIECE-2026-07-09.md`](DESIGN-PANEL-CHART-MASTERPIECE-2026-07-09.md) | Chart design-panel masterpiece |
| [`VISUAL-OVERHAUL-RESEARCH-2026-07-09.md`](VISUAL-OVERHAUL-RESEARCH-2026-07-09.md) | Visual overhaul research |
| [`SITE-MERGER-PLAN-2026-07-08.md`](SITE-MERGER-PLAN-2026-07-08.md) | Site merger plan |
| [`MOMENT-ART-OVERHAUL-2026-07-08.md`](MOMENT-ART-OVERHAUL-2026-07-08.md) | Moment-art overhaul |

## Historical audits (NOISE for day-to-day; keep on disk)

Point-in-time audits, scorecards, and multi-team reviews. Fine for archaeology; **not** for “is this fixed / deployed?”.

- `MULTI-TEAM-AUDIT-2026-07-09-v655.md`, `MULTI-TEAM-AUDIT-2026-07-09-v656.md`, `MULTI-TEAM-FLOW-2026-07-09-v657.md`
- `VISUAL-SCORE-JET-AURORA-ap-v666.md`
- `FULL-SITE-AUDIT-2026-07-09.md`
- `REGRESSION-ANALYSIS-2026-07-09.md`
- `EXPERT-BUG-SCREENSHOT-AUDIT-2026-07-09.md`, `EXPERT-TEAM-3D-MODEL-AUDIT-2026-07-11.md`
- `DESIGN-SCORECARD-2026-07-09.md`, `GRAPHICS-AUDIT-SCORECARD-2026-07-09.md`
- `USER-SCREENSHOT-AUDIT-STRUCTURE-2026-07-09.md`

**Note:** Dated deploy claims and old `ap-v###` tips inside these files may be wrong relative to today. **`STATUS.md` is tip truth.**

## Rule

If a dated doc says “not deployed” or an old `ap-v` tip, treat it as a **snapshot from its date**.

| Source of truth | Path |
|---|---|
| Current product / deploy tip | [`../STATUS.md`](../STATUS.md) |
| Service-worker / cache tip | [`../website/sw.js`](../website/sw.js) (`ap-v###`) |
| Cross-agent ops notes | [`../AGENT-HANDOFF.md`](../AGENT-HANDOFF.md) |

Do not contradict STATUS or `sw.js` with prose from a July 8–11 plan or audit unless you re-verify live/local tip.
