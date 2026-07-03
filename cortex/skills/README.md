# Skills — executable playbooks

The Cortex Leader's working methods written down so ANY agent — cloud or local,
Claude, Grok, or Hermes — can execute them. They are plain procedures: no tools or
network required unless a step says so, so they work offline too.

| Skill | Use when |
|---|---|
| [verify-before-claiming.md](verify-before-claiming.md) | Before recording any conclusion, marking a mission done, or trusting a doc |
| [capability-delegation.md](capability-delegation.md) | Deciding whether to do a task yourself or hand it to a cheaper model/worker |
| [ship-website-change.md](ship-website-change.md) | Any change under `website/**` — the full path from edit to verified-live |
| [ingest-knowledge.md](ingest-knowledge.md) | After finishing significant work, or when new material lands in `cortex/raw/` |

Rules of the shelf:
- Skills are procedures, not opinions — if a step is repo-specific it says so.
- Improve a skill when you find a better way (that's a memory entry + a skill edit,
  shipped together). The Leader reviews skill edits like instruction-layer changes.
- New skill = new file + a row here + an `activity` entry in `state.js`.
