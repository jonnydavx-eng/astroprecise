---
description: Append-only per-mission decision logs (JSONL) — queryable telemetry with jq, no server.
tags: telemetry, trajectory, protocol
---

# trajectories/

One append-only `M<id>.jsonl` per mission. Agents "fail gracefully" — they exit clean
with wrong output — so we log **decisions**, not just success. This is the file-native
equivalent of OpenTelemetry GenAI spans: queryable with `jq`, no collector, no server.

## Line schema (one JSON object per line)

```json
{"ts":"2026-07-03T11:40:00Z","agent":"Claude","mission":"M9","event":"decision",
 "what":"build state schema before the view","why":"keeps the rewrite clean",
 "files":["cortex/state.js"],"gate":null}
```

Fields: `ts` (ISO), `agent`, `mission`, `event` (start | decision | edit | gate |
handoff), `what`, `why` (for decisions), `files` (touched), `gate` (result of a
check, e.g. "validate-state: pass").

## Rules

- Append only; never rewrite history.
- Log a line at: mission start, each non-obvious decision, each gate run, handoff.
- Keep `why` honest and specific — this is what makes a sideways run debuggable.

## Query examples

```
# every decision on M9
jq 'select(.mission=="M9" and .event=="decision")' cortex/trajectories/M9.jsonl
# all files an agent touched
jq -r 'select(.agent=="Grok").files[]' cortex/trajectories/*.jsonl | sort -u
# gate failures across all missions
jq 'select(.event=="gate" and (.gate|test("fail")))' cortex/trajectories/*.jsonl
```
