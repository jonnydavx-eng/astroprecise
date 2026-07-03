# Skills — executable playbooks

The Cortex Leader's working methods written down so ANY agent — cloud or local,
Claude, Grok, or Hermes — can execute them. They are plain procedures: no tools or
network required unless a step says so, so they work offline too.

Each skill carries YAML frontmatter (`name`, `description`, `when_to_use`, `tags`) so
an agent can load just the frontmatter to decide relevance, then open the full file
only on a match (progressive disclosure — the Anthropic Agent Skills pattern). The
smallest model (Hermes) greps `../INDEX.md` first and never has to read all of them.

| Skill | Use when |
|---|---|
| [verify-before-claiming.md](verify-before-claiming.md) | Before recording any conclusion, marking a mission done, or trusting a doc |
| [capability-delegation.md](capability-delegation.md) | Deciding whether to do a task yourself or hand it to a cheaper model/worker |
| [ship-website-change.md](ship-website-change.md) | Any change under `website/**` — the full path from edit to verified-live |
| [ingest-knowledge.md](ingest-knowledge.md) | After finishing significant work, or when new material lands in `cortex/raw/` |
| [memory-distill.md](memory-distill.md) | Periodically, or when a memory file exceeds its size cap — compress + evict |
| [maintenance-sweep.md](maintenance-sweep.md) | The weekly autonomous repo-health checklist (Actions) |

Rules of the shelf:
- Skills are procedures, not opinions — if a step is repo-specific it says so.
- Improve a skill when you find a better way (that's a memory entry + a skill edit,
  shipped together). The Leader reviews skill edits like instruction-layer changes.
- New skill = new file + a row here + an `activity` entry in `state.js`.
