---
name: ingest-knowledge
description: Turn raw material and finished-mission insight into durable, findable wiki knowledge; includes the lint pass.
when_to_use: after significant work, or when files land in cortex/raw/
tags: skill, wiki, ingest
---

# Skill: Ingest knowledge into the wiki

Turns raw material and finished-mission insights into durable, findable knowledge.
Run after significant work, or when files land in `cortex/raw/`.

## Procedure

1. **Read `cortex/index.md` first.** Know what pages exist so you extend instead of
   duplicating. Prefer updating an existing page over creating a near-twin.
2. **Extract only the durable.** From a finished mission: decisions made and why,
   facts verified (with evidence), traps discovered. Skip play-by-play — that's
   what log.md and git history are for.
3. **Verify before writing** (see verify-before-claiming.md). Wiki pages carry a
   "Last verified" date — that date is a promise.
4. **Write/update the page** under `cortex/wiki/` with cross-links to related pages.
5. **Update the index**: page table row (title, covers, date), and record any
   contradiction you found as a lint finding — never silently resolve one.
6. **Feed memory**: session lessons → your `cortex/memory/<agent>.md`. If you're the
   Leader, consider whether shared-learnings.md needs a distill pass.
7. **Clean raw/**: ingested material gets deleted or compressed to a pointer.

## Lint pass (occasional, or when touching an old page)

For each claim on the page: is it still true against the current repo? Newer commit
touching the subject = re-verify. Contradictions between docs go in index.md
§ lint findings with both sources cited; the fix becomes a mission, not a footnote.

## Quality bar

A good wiki page lets an agent skip an hour of re-derivation. If a page wouldn't
save future-you real time, it shouldn't exist — fold it into an existing page.
