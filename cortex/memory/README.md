---
description: Rules for the three-tier agent memory system — how agents remember and learn across sessions.
tags: memory, protocol, learning
---

# Agent Memory (three-tier)

Persistent, per-agent memory plus one distilled shared spot. This is how agents
*learn*: lessons survive sessions because they live in the repo. Structure follows
the production consensus (the CoALA taxonomy: episodic / semantic / procedural).

## Files

- `<agent>.md` — one per agent (`claude.md`, `grok.md`, `hermes.md`). Three tiers:
  - **## Episodes** — append-only run log (what happened this session). Prunable.
  - **## Learnings** — distilled, durable facts/lessons. **Hard cap ~60 lines.**
  - **## Procedures** — pointers into `../skills/` for repeatable methods.
- `shared-learnings.md` — **the one clean spot.** Leader-distilled, deduplicated,
  verified cross-agent knowledge. **Hard cap ~120 lines.** Every agent reads this
  first. Only the Leader edits it.
- `archive/` — overflow. When a file exceeds budget, oldest Episodes and evicted
  Learnings move here (greppable, not auto-loaded). Git keeps the full history, so
  eviction is always revertible.

## Why the size caps matter

The single failure mode of file-based memory is unbounded growth until nobody loads
it. The cap forces compression — the same discipline MemGPT/Letta enforce with a
byte budget and Claude Code enforces by auto-loading only the first ~200 lines.
Small + verified beats large + noisy.

## The rules

1. **Write memory before handing off** — same moment you update `state.js`.
2. **Verified reflection gate.** A lesson may enter `Learnings` (and be promoted to
   `shared-learnings.md`) only with a `confirmed-by:` note — a test run, a rerun, or
   Leader/verifier review. Unverified reflection *degrades* systems (memory
   confabulation); see `../skills/verify-before-claiming.md`.
3. **Concrete beats general.** "Owner prefers PayPal direct (2026-07-02)" is memory;
   "be user-focused" is noise.
4. **Failures are first-class.** What didn't work and why prevents repeats.
5. **Leader-only distill.** Other agents append to their own file's `Episodes`; the
   Leader verifies, then distills into `Learnings` / `shared-learnings.md`, evicting
   or archiving what's stale. See `../skills/memory-distill.md`.
6. **Memory commits are separate.** Ship memory edits as their own commit
   (`mem(grok): lesson about X`) so the Leader can review the memory-diff.

## Reflection template (paste at end of each session into your Episodes)

```
### <date> · <mission id> · <one-line outcome>
- did: <what you actually changed / produced>
- worked: <what went right>
- failed: <what didn't, and why — be specific>
- lesson: <the rule for next time>
- confirmed-by: <test output / rerun / leader review / UNVERIFIED>
```
