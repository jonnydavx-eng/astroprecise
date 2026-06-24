#!/usr/bin/env bash
# capture-session.sh — SessionEnd hook for the second-brain vault.
#
# Reads the Claude Code SessionEnd payload on stdin, extracts a readable
# transcript of the chat that just ended, writes it as a raw source under
# second-brain/raw/sessions/, then commits + pushes so the capture survives
# the ephemeral cloud environment.
#
# It deliberately never fails the session: every step is best-effort and the
# script always exits 0.
set -uo pipefail

payload="$(cat)"
transcript="$(printf '%s' "$payload" | jq -r '.transcript_path // empty' 2>/dev/null)"
session_id="$(printf '%s' "$payload" | jq -r '.session_id // "unknown"' 2>/dev/null)"
reason="$(printf '%s' "$payload" | jq -r '.reason // "unknown"' 2>/dev/null)"

# Resolve paths relative to this script so it works from any cwd.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
vault="$(cd "$script_dir/.." && pwd)"     # second-brain/
repo="$(cd "$vault/.." && pwd)"           # repo root
sessions_dir="$vault/raw/sessions"
mkdir -p "$sessions_dir"

ts="$(date -u +%Y-%m-%d-%H%M%S)"
short_id="${session_id:0:8}"
out="$sessions_dir/$ts-$short_id.md"

# No transcript to read -> nothing to do.
[ -n "$transcript" ] && [ -f "$transcript" ] || exit 0

# Extract a clean, readable transcript from the JSONL.
{
  echo "---"
  echo "created: $(date -u +%Y-%m-%d)"
  echo "tags: [type/session-log, status/seedling]"
  echo "source: chat session $session_id"
  echo "---"
  echo
  echo "# Session capture — $ts UTC"
  echo
  echo "- session: \`$session_id\` · ended: \`$reason\`"
  echo
  echo "> Raw chat capture. To fold it into the wiki, tell Claude:"
  echo "> \`ingest the new session logs in raw/sessions/\`"
  echo
  echo "---"
  echo
  jq -r '
    select(.type=="user" or .type=="assistant")
    | (.message.role // .type) as $role
    | (
        if (.message.content | type) == "string" then .message.content
        else
          ([.message.content[]?
            | if .type=="text" then .text
              elif .type=="tool_use" then "`[tool: \(.name)]`"
              else empty end] | join("\n"))
        end
      ) as $text
    | select($text != null and ($text | gsub("\\s";"")) != "")
    | "## " + ($role|ascii_upcase) + "\n\n" + $text + "\n"
  ' "$transcript" 2>/dev/null
} > "$out"

# If extraction produced nothing meaningful, drop the file and bail.
if [ ! -s "$out" ] || [ "$(wc -l < "$out")" -le 14 ]; then
  rm -f "$out"
  exit 0
fi

# Commit + push, best-effort. Never block the session on git.
cd "$repo" || exit 0
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
git add "$out" 2>/dev/null
if ! git diff --cached --quiet 2>/dev/null; then
  git -c user.email=jonnydavx@gmail.com -c user.name=jonnydavx-eng \
    commit -q -m "second-brain: capture session $short_id ($ts UTC)" 2>/dev/null
  if [ -n "$branch" ] && [ "$branch" != "HEAD" ]; then
    for i in 1 2 3 4; do
      git push -u origin "$branch" 2>/dev/null && break
      sleep $((2**i))
    done
  fi
fi

printf '{"systemMessage":"🧠 second-brain captured this chat to raw/sessions/%s"}\n' "$ts-$short_id.md"
exit 0
