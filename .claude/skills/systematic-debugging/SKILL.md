---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior in AstroPrecise (Gradle build/test failures, wrong chart math, website console errors, broken live feeds) — BEFORE proposing fixes. A four-phase root-cause process that fixes the cause, not the symptom.
---

# Systematic Debugging

> Adapted for this repo from the `systematic-debugging` skill in
> github.com/obra/superpowers (the "Superpowers" framework). Process is theirs;
> the AstroPrecise component boundaries are ours.

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying
issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom
fixes are failure.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Any technical issue: test failures, production bugs, unexpected behavior,
performance problems, build failures, integration issues. **Especially** under
time pressure, when "just one quick fix" seems obvious, when you've already
tried multiple fixes, or when you don't fully understand the issue. **Don't
skip** because the issue "seems simple" — simple bugs have root causes too.

## The Four Phases

Complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read error messages carefully** — stack traces, line numbers, file paths,
   error codes. They often contain the exact solution.
2. **Reproduce consistently** — exact steps, every time? If not reproducible,
   gather more data; don't guess.
3. **Check recent changes** — `git diff`, recent commits, new dependencies,
   config changes, environment differences.
4. **Gather evidence at component boundaries.** AstroPrecise has multiple
   layers — instrument each boundary and run once to see WHERE it breaks before
   theorizing about WHY:
   - **App:** Screen ← ViewModel `UiState` ← Repository ← Calculator/Generator.
     Log the value entering/leaving each layer (e.g. raw birth input →
     `BirthChartCalculator` Julian day → planetary longitudes → `UiState`).
   - **Website:** input/place-search → `localToUT` conversion →
     `AstroEphemeris.calculateNatalChart` → `interpretations.js` →
     rendered DOM/canvas. Log what enters and exits each module.
   - **Live feeds:** network response → parse → fallback decision → display
     label (the `fieldweather.js` honest-fallback pattern is where many "wrong
     data" reports actually originate).
5. **Trace data flow** — when the error is deep in the call stack, trace the bad
   value backward to its origin. Fix at the source, not the symptom.

### Phase 2: Pattern Analysis

1. **Find working examples** — similar code in the same codebase that works.
2. **Compare against references** — if implementing a pattern, read the
   reference implementation completely, not skimmed.
3. **Identify differences** — list every difference, however small; don't assume
   "that can't matter."
4. **Understand dependencies** — required components, settings, environment,
   assumptions.

### Phase 3: Hypothesis and Testing

1. **Form a single hypothesis** — "I think X is the root cause because Y." Be
   specific.
2. **Test minimally** — the smallest possible change, one variable at a time.
3. **Verify before continuing** — worked → Phase 4; didn't → form a NEW
   hypothesis, don't stack fixes.
4. **When you don't know, say so** — "I don't understand X." Research or ask;
   don't pretend.

### Phase 4: Implementation

1. **Create a failing test case first** — simplest reproduction. `./gradlew
   test` for the app; a minimal repro page/console snippet for the website. Must
   have it before fixing.
2. **Implement a single fix** — address the root cause, one change, no "while
   I'm here" refactors.
3. **Verify the fix** — test passes, no other tests broken, issue actually
   resolved.
4. **If the fix doesn't work** — STOP and count attempts. `< 3`: return to
   Phase 1 with the new information. **`≥ 3`: stop and question the
   architecture** — don't attempt fix #4 blindly.
5. **If 3+ fixes failed** — the pattern may be the problem (each fix reveals new
   coupling elsewhere; fixes need "massive refactoring"). Discuss with the human
   before more attempts. This is a wrong architecture, not a failed hypothesis.

## Red Flags — STOP and return to Phase 1

"Quick fix for now, investigate later" · "just try changing X" · "add multiple
changes, run tests" · "skip the test, I'll verify manually" · "it's probably X"
· proposing solutions before tracing data flow · "one more fix attempt" (after
2+) · each fix reveals a new problem in a different place.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too; the process is fast for them. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | The first fix sets the pattern. Do it right from the start. |
| "I'll write the test after the fix works" | Untested fixes don't stick. Test first proves it. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Question the pattern. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| 1. Root Cause | Read errors, reproduce, check changes, instrument boundaries | Understand WHAT and WHY |
| 2. Pattern | Find working examples, compare | Identify differences |
| 3. Hypothesis | Form theory, test minimally | Confirmed or new hypothesis |
| 4. Implementation | Create test, fix, verify | Bug resolved, tests pass |

95% of "no root cause" conclusions are incomplete investigation. If it truly is
environmental/timing/external, document what you investigated and implement
appropriate handling (retry, timeout, honest error message) plus logging.
