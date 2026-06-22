# raw/sessions/ — automatic chat captures

Files here are written **automatically** by the `SessionEnd` hook
(`second-brain/tools/capture-session.sh`, wired in `astroprecise/.claude/settings.json`).
When a Claude Code chat ends, the conversation is saved here as a dated raw
source and committed + pushed.

They are raw material, like anything else in `raw/`. To turn the recent ones
into proper linked wiki notes, just tell Claude:

```
ingest the new session logs in raw/sessions/
```

Captures you don't want to keep are safe to delete — they're only an inbox.
