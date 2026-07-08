---
name: capability-delegation
description: Decide per task whether to do it yourself or hand it to a cheaper model/worker — with an offline single-model variant.
when_to_use: starting any non-trivial task
tags: skill, delegation, orchestration
---

# Skill: Capability-based delegation

Decide per task: do it yourself, or hand it to a cheaper model/worker. The goal is
final quality per unit of cost — never delegation for its own sake.

## Decision rules

**Keep it yourself when the task needs:**
- Synthesis across many sources into one judgment (mission planning, distilling
  shared-learnings, writing instruction-layer files)
- Long-horizon coherence (the answer depends on things learned an hour ago)
- Novel design decisions or anything the owner will experience directly
- Final review of anything delegated (non-negotiable)

**Delegate when the task is:**
- Recon: "what's in these 20 files", "where is X used", cataloging, inventories
  → cheapest capable model (Claude sessions: `scout` worker on Haiku)
- Verification: "try to refute this specific claim"
  → mid-tier model with the verify-before-claiming skill (Claude: `verifier`)
- Mechanical transforms with a checkable output (rename sweep, format conversion)
  → any model + a verification step you run afterwards

**The test:** write the delegate's instructions. If writing instructions precise
enough to trust takes longer than doing the task, do it yourself.

## Non-negotiables

1. The delegator owns the result. Spot-check facts against the actual files before
   using delegated output — scouts summarize, and summaries drift.
2. Delegate with a required output shape ("table: filename, one-liner, stale?, refs")
   so results are mergeable and gaps are visible.
3. Parallel beats sequential: independent recon tasks go out simultaneously.
4. "Pure Fable Mode" (owner directive) = no delegation on that mission.

## Offline / single-model variant (Hermes)

No second model available? Delegation becomes *phase separation*: do the recon pass
first in a cheap mode (skim, catalog, don't judge), write the catalog down, THEN do
the judgment pass reading only your catalog. The discipline — separating collection
from synthesis, verifying before trusting — is the point, not the second model.
