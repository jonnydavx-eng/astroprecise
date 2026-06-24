---
name: superpowers-workflow
description: The agentic development loop for non-trivial AstroPrecise work — brainstorm → plan → TDD → debug → review → verify → finish the branch. Use when starting a feature, refactor, or multi-step change and you want to work autonomously without veering off plan. Points to the focused systematic-debugging and frontend-design skills at the right moments.
---

# Superpowers Workflow (AstroPrecise)

> Adapted for this repo from the "Superpowers" framework
> (github.com/obra/superpowers by Jesse Vincent). That project ships ~14
> discrete workflow skills; this is a condensed, AstroPrecise-tailored map of
> the loop. The detailed root-cause method lives in the companion
> `systematic-debugging` skill.

A disciplined loop beats improvisation on anything bigger than a one-liner. Run
the phases in order; don't skip ahead because a step "seems unnecessary."

## The loop

1. **Brainstorm.** Clarify what's actually being asked and why. Surface
   unknowns and 2–3 viable approaches with trade-offs before committing. For UI
   work, hand the visual direction to the `frontend-design` skill here.
2. **Write the plan.** A short, explicit plan: the files you'll touch, the
   sequence, and how you'll know it works. Keep it where you can refresh it as
   facts change. Prefer the smallest plan that delivers the outcome.
3. **Test-driven where it pays.** For logic with a right answer —
   `BirthChartCalculator`, `HoroscopeGenerator`, the website's ephemeris math —
   write the failing test first (`./gradlew test`), then make it pass. The
   repo's determinism rule makes these cheap and high-value: a seeded input has
   one correct output. Pure UI/visual changes lean on screenshots and
   self-critique instead.
4. **Implement in small, verifiable steps.** One concern at a time. Match the
   surrounding code's idiom, naming, and comment density (comments only for
   algorithm math or non-obvious invariants).
5. **Debug systematically.** The moment something fails or surprises you, switch
   to the `systematic-debugging` skill — root cause before fixes, no thrashing.
6. **Request and receive code review.** Before claiming done, review your own
   diff (or run `/code-review`): correctness first, then
   reuse/simplification/efficiency. Address findings instead of defending them.
7. **Verify before completion.** Actually run it — `./gradlew assembleDebug` /
   `test` / `lint` for the app, `./launch.sh` and exercise the page for the
   website. Confirm no live feed is faked and hero stats are still true. Report
   outcomes honestly: if tests fail, say so with the output.
8. **Finish the branch.** Commit with clear messages, push to
   `claude/claude-skills-improvement-vtl3hz`, open a draft PR if none exists.
   Leave the tree clean.

## Working autonomously without veering off

- Re-read the plan between steps; if reality diverges, update the plan and say
  what changed — don't silently improvise a different feature.
- One change at a time, verified, before the next. Resist "while I'm here"
  detours; capture them as follow-ups instead.
- Use subagents for genuinely independent fan-out work (e.g. searching the
  website's large `interpretations.js`), then keep the conclusion, not the file
  dumps.
- When a decision is genuinely the human's to make (architecturally significant,
  or ambiguous brief), ask — don't guess on the expensive stuff.

## AstroPrecise guardrails baked into "done"

- No framework / no build step on the website; Compose + single `UiState` per
  screen in the app.
- Warm-observatory palette only; the retired cool palette stays retired.
- Determinism: same inputs → same output everywhere.
- Honesty: live feeds labelled, unavailable feeds say so, no fabricated data.
