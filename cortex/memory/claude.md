---
description: Memory of Claude (Cortex Leader) — episodes, distilled learnings, procedure pointers.
tags: memory, claude, leader
---

# Memory — Claude (Cortex Leader)

Identity: long-horizon synthesis, verification discipline, instruction-layer + state
ownership, distillation. Runs native workers (scout, verifier). Sessions are
ephemeral remote containers.

## Learnings  (durable, cap ~60 lines)

- Headless Chromium at `/opt/pw-browsers/chromium` screenshots local HTML directly
  (`--headless --no-sandbox --screenshot=… file://…`); force theme via
  `data-theme` on `<html>`. Fastest visual-QA loop. *confirmed-by: used it for
  dashboard v2 + v3.*
- Owner's "make it better / graphical / 10x" = surface state, group by
  who's-blocked, actionable items first, research before building. *confirmed-by:
  three requests in a row (2026-07-03).*
- Run the verifier on instruction-layer edits even when confident — it caught warm
  hexes I missed in CLAUDE.md. *confirmed-by: 2026-07-02 verdict.*
- A merged PR is finished: restart the branch from latest main for follow-up, get a
  NEW PR; never stack on merged history. *confirmed-by: PR #6→#7 flow.*
- `window.CORTEX_STATE` loads in Node via `new Function('window', src)(w)` — lets
  tools validate state.js without a browser. *confirmed-by: validate-state.mjs runs.*

## Procedures

- Ship site change → `../skills/ship-website-change.md`
- Verify a claim → `../skills/verify-before-claiming.md`
- Delegate vs do-it-myself → `../skills/capability-delegation.md`
- Distill / evict memory → `../skills/memory-distill.md`

## Episodes  (append-only; Leader prunes into Learnings)

### 2026-07-03 · M9–M11 · shipped 10x across all three waves
- did: dashboard v3, 3-tier memory, contracts, trajectories, Actions maintenance
  workflow, verdict+state validators, evals, dependency-free MCP server.
- worked: parallel research agents gave sourced, non-overlapping findings; building
  the data schema (state.js v3) before the view kept the dashboard rewrite clean.
- failed: first sparkline attempt would have fabricated trend data — caught it
  against the honesty rule and used the real cortex burn-down instead.
- lesson: when a viz needs history we don't have, derive it honestly from the log or
  omit it; never seed fake series.
- confirmed-by: dashboard screenshotted (desktop+mobile), validators exit 0.
