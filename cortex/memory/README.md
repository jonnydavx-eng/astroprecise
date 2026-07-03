# Agent Memory

Persistent, per-agent memory plus one distilled shared spot. This is how agents
"learn": lessons survive sessions because they live in the repo, not in a context
window.

## Files

- `<agent>.md` — one file per agent (`claude.md`, `grok.md`, `hermes.md`, …).
  The agent itself writes here: what it learned, what failed, owner preferences it
  observed. Newest first, dated, concrete.
- `shared-learnings.md` — **the one clean spot.** The Cortex Leader periodically
  distills the per-agent files into this: deduplicated, verified, organized by topic.
  Any agent can read just this file and get everyone's accumulated knowledge.

## Rules

1. **Write memory before handing off** — same moment you update `state.js`. A session
   that learned nothing worth writing is rare; look harder.
2. **Concrete beats general.** "Owner prefers PayPal direct over merchant-of-record
   (2026-07-02)" is memory; "be user-focused" is noise.
3. **Failures are first-class.** What didn't work and why prevents repeats — record it.
4. **Only the Leader edits `shared-learnings.md`.** Other agents feed it via their own
   file; the Leader verifies (see `../skills/verify-before-claiming.md`) then distills.
   This keeps the one spot clean — no contradictions, no duplicates.
5. **Prune on distill.** Once a per-agent entry is folded into shared-learnings, the
   Leader may compress it to one line. Memory files stay short enough to read fully.
