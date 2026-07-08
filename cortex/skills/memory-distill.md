---
name: memory-distill
description: Leader/sleep-time procedure to compress raw episodes into verified learnings, evict/merge stale entries, and keep memory under budget.
when_to_use: periodically, or when any memory file exceeds its size cap
tags: skill, memory, leader, hermes
---

# Skill: Distill & prune memory

Keeps the memory system *compounding* instead of *bloating*. Run as a Leader pass, or
as Hermes's sleep-time job between missions (Hermes proposes; Leader promotes).

## The distill pass

1. **Collect** new `## Episodes` across all `memory/<agent>.md` since last pass.
2. **Extract candidate lessons.** For each episode, is there a durable, general rule?
   Skip play-by-play (that's the log + git history).
3. **Verify each candidate** (see `verify-before-claiming.md`). A lesson needs a
   `confirmed-by:` (test, rerun, review). Unverified → leave in Episodes flagged
   UNVERIFIED, or drop. Never promote unverified lessons — that's how memory rots.
4. **Promote** verified lessons: into the agent's `## Learnings`, and if it's useful
   fleet-wide, into `shared-learnings.md` (dedup against what's there).
5. **Compress** the source episode to one line or archive it.

## The prune/evict pass (budget enforcement)

Caps: per-agent `Learnings` ~60 lines, `shared-learnings.md` ~120 lines.

- **Merge** near-duplicate learnings into the stronger phrasing.
- **Evict** learnings not referenced/used in the last N missions (recency × usage —
  the Generative-Agents ranking). Move to `memory/archive/<agent>-<month>.md`.
- **Eviction is safe** — git history keeps everything; a wrong eviction is one revert.
- Ship the changes as a `mem(distill): …` commit so the diff is reviewable.

## Hermes sleep-time variant (offline)

Hermes runs steps 1–3 locally and writes candidates into a `## Proposed` block in its
own file, each tagged with `confirmed-by: UNVERIFIED` unless it ran a check. It does
NOT edit `shared-learnings.md`. The Leader reviews `## Proposed` on the next session
and promotes what survives. Weaker model ⇒ stricter gate (memory-poisoning risk).

## Health check

After a pass: `wc -l cortex/memory/*.md` — any file over budget means the pass
wasn't aggressive enough. The goal is small + verified + high hit-rate, not complete.
