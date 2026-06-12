#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
SITE_DIR="$REPO_DIR/website"
PORT="${PORT:-8420}"
URL="http://localhost:$PORT/"

if ! curl -s -o /dev/null --max-time 1 "$URL" 2>/dev/null; then
  ( cd "$SITE_DIR" && exec python3 -m http.server "$PORT" >/dev/null 2>&1 ) &
  for _ in $(seq 1 20); do
    curl -s -o /dev/null --max-time 1 "$URL" 2>/dev/null && break
    sleep 0.25
  done
fi

echo "AstroPrecise serving at $URL"

if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
elif command -v open >/dev/null 2>&1; then open "$URL"
elif command -v start >/dev/null 2>&1; then start "$URL"
else echo "Open $URL in your browser"
fi
