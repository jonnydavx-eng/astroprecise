---
description: Cross-model verdicts — a different model than the mission owner must review before a mission is trusted done.
tags: quality, verdict, verification, protocol
---

# verdicts/

The cross-model quality gate. Our fleet's model diversity (Claude, Grok, Hermes) is
an unusual asset — this uses it to attack the biggest multi-agent failure mode:
confidently-wrong completions.

## Rule

A mission tagged `gated: true` in `state.js` may not be marked `done` until a
`verdicts/M<id>.md` exists, authored by a **different model than the mission owner**,
recording a REFUTE-oriented review. Enforced by `tools/check-verdicts.mjs` (CI).

Historical missions (M1–M8) are **grandfathered** — not gated, and honestly reported
as "no verdict on record" rather than pretended-verified. The gate is armed for
missions that opt in going forward.

## Verdict file format

```
# Verdict — M<id>: <title>
- reviewer: <model/agent, must differ from owner>
- method: <what you actually checked — commands, files, reruns>
- verdict: CONFIRMED | REFUTED | PARTIAL
- findings:
  - <specific evidence, file:line, command output>
- residual-risk: <what you could not verify>
```

Default to skepticism: if you cannot positively confirm with evidence from your own
run, the verdict is REFUTED or PARTIAL, not CONFIRMED.
