---
description: Overflow store for evicted/aged memory — greppable, not auto-loaded.
tags: memory, archive
---

# memory/archive/

When a memory file exceeds its size budget, the Leader moves the oldest Episodes and
evicted Learnings here (e.g. `claude-2026-07.md`). Nothing here is auto-loaded — it's
kept only so an agent can `grep` for a past detail on demand, and so eviction stays
revertible via git. The live `../*.md` files remain short enough to read in full.
