---
description: Golden missions + rubrics that gate changes to the agent instruction layer (skills, bootstrap prompt).
tags: evals, quality, agents
---

# evals/

We gate site code with tests. This gates the **agent layer** — the skills and
bootstrap prompt — the same way. When you change how agents are told to work, run the
golden missions and check the output against the rubric before merging.

Because agents are non-deterministic, an eval is a *rubric-scored end-state check*,
not an exact-match test: give the mission to the agent, then score the result against
the rubric's criteria (ideally with a different model as judge).

## Files

- `golden/<id>.md` — a representative mission with a fixed brief and a rubric.
- Add one whenever a class of work matters enough to protect from regression.

## How to run (manual until Wave-2 Actions wire it up)

1. Give the agent only the bootstrap prompt (`../agents.md`) + the golden brief.
2. Capture what it produces.
3. Score against the rubric (0–2 per criterion). A change to skills/bootstrap that
   drops the score is a regression — fix the instructions, not the rubric.

## Success bar

A passing agent-layer change holds or improves every golden mission's score. Keep the
set small and representative — 3–5 golden missions beat 50 shallow ones.
