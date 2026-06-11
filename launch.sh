#!/usr/bin/env bash
# AstroPrecise — local preview launcher.
#
#   ./launch.sh            serve the website and open it in your browser
#   ./launch.sh --install  also add an "AstroPrecise" icon to your desktop
#                          and app menu (Linux), so you can launch with a click
#
# No build step — the site is static. Requires python3 (for the server).

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_DIR="$REPO_DIR/website"
PORT="${PORT:-8420}"
URL="http://localhost:$PORT/"

install_launcher() {
  local desktop_file="[Desktop Entry]
Type=Application
Name=AstroPrecise
Comment=Birth charts, horoscopes, and The Instrument — local preview
Exec=$REPO_DIR/launch.sh
Icon=$SITE_DIR/img/icon-512.png
Terminal=false
Categories=Utility;Education;
Keywords=astrology;birth chart;horoscope;"

  mkdir -p "$HOME/.local/share/applications"
  echo "$desktop_file" > "$HOME/.local/share/applications/astroprecise.desktop"
  chmod +x "$HOME/.local/share/applications/astroprecise.desktop"
  echo "✦ App menu entry installed: ~/.local/share/applications/astroprecise.desktop"

  if [ -d "$HOME/Desktop" ]; then
    echo "$desktop_file" > "$HOME/Desktop/AstroPrecise.desktop"
    chmod +x "$HOME/Desktop/AstroPrecise.desktop"
    # GNOME requires marking desktop files trusted before they run on double-click
    command -v gio >/dev/null 2>&1 && gio set "$HOME/Desktop/AstroPrecise.desktop" metadata::trusted true 2>/dev/null || true
    echo "✦ Desktop icon installed: ~/Desktop/AstroPrecise.desktop"
  fi
  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
}

[ "${1:-}" = "--install" ] && install_launcher

# Serve (reuse an already-running instance if the port is taken)
if ! curl -s -o /dev/null --max-time 1 "$URL" 2>/dev/null; then
  ( cd "$SITE_DIR" && exec python3 -m http.server "$PORT" >/dev/null 2>&1 ) &
  for _ in $(seq 1 20); do
    curl -s -o /dev/null --max-time 1 "$URL" 2>/dev/null && break
    sleep 0.25
  done
fi

echo "✦ AstroPrecise serving at $URL"

# Open in the default browser, whatever the platform calls it
if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
elif command -v open >/dev/null 2>&1; then open "$URL"          # macOS
elif command -v start >/dev/null 2>&1; then start "$URL"        # Windows (Git Bash)
else echo "  open $URL in your browser"
fi
