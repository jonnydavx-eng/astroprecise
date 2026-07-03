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

### 2026-07-03 · M9–M11 · cross-model verdict caught 3 real bugs I shipped
- did: had the verifier (Sonnet tier) adversarially review the 10x build after I
  pushed it.
- failed (mine): (1) CI MCP smoke-test grepped `'"pass": true'` which never matches
  escaped JSON — the checks job would've been red every run; (2) `secrets.X` in a
  job-level `if:` is unsupported by GitHub; (3) cortex trend ended at 2 vs real 1.
- worked: fixes were mechanical once named; added a validator invariant so a stale
  trend can NEVER be committed again (endpoint must equal live count).
- lesson: my own tests being green ≠ correct — I tested the MCP server directly but
  not the CI *step* that wraps it. Verify the wrapper, not just the unit. And gate
  real: I set M9/M11 gated:true so the verdicts are enforced, not decorative.
- confirmed-by: validator rejects injected stale trend; mcp-smoke.mjs green;
  check-verdicts green with gated M9/M11 + verdict files present.

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
