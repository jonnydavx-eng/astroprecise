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
- A security/quality GATE must be adversarially tested against BYPASS, not the happy
  path — and verify the *wrapper* (CI step), not just the unit. *confirmed-by: the
  verdict gate passed my tests yet had no author check; a 5-agent audit found it.*
- Audit my own honesty claims before handoff — I broke the no-fake-data rule twice
  (vague "PR watch loop", uncommitted screenshots cited as proof) without noticing.
- Never seed a fake trend/series to fill a chart — derive from the real log or omit;
  now machine-enforced (validate-state trend endpoint == live count).

## Procedures

- Ship site change → `../skills/ship-website-change.md`
- Verify a claim → `../skills/verify-before-claiming.md`
- Delegate vs do-it-myself → `../skills/capability-delegation.md`
- Distill / evict memory → `../skills/memory-distill.md`

## Episodes  (append-only; Leader prunes into Learnings)

### 2026-07-03 · M9/M11 · a 5-agent audit found my flagship feature had no teeth
- did: ran an independent audit workflow (4 adversarial auditors + critic) over the
  10x fixes, since those had only my own deterministic checks.
- failed (mine): the "machine-enforced verdict gate" only checked file existence —
  a self-authored verdict passed, and `gated:"true"` (string) silently bypassed it.
  Also a real href XSS (`javascript:` link), a workflow perms gap, and 2 honesty
  misses in my own state/log (vague "PR watch loop", uncommitted "screenshots" cited
  as proof).
- worked: refactored all validation into one shared `state-lib.mjs` (CLI + gate + MCP
  can't drift); gate now parses `reviewer:` and rejects self-review.
- lesson: a security/quality GATE must be adversarially tested against BYPASS, not
  just the happy path. "I built a gate" ≠ "the gate has teeth." Also: audit your own
  honesty claims — I broke the no-fake-data rule twice without noticing.
- confirmed-by: scratch tests show gate rejects self-review + string gated; safeHref
  blocks javascript:/data:; validators degrade cleanly on missing arrays.

### 2026-07-03 · M9–M11 · shipped 10x (waves 1–3) + first cross-model verdict
- distilled to Learnings above. Shipped dashboard v3, 3-tier memory, contracts,
  trajectories, Actions maintenance, validators, evals, MCP server. Verifier (Sonnet)
  then caught 4 real bugs (CI grep, secret-in-if, stale trend, unrendered fields),
  all fixed. Full detail: cortex/log.md 2026-07-03 entries; verdicts/M9.md, M11.md.
