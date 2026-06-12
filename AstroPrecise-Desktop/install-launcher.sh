#!/usr/bin/env bash
# Run this once to install the AstroPrecise desktop launcher on Linux/Mac.
set -e

REPO="$(cd "$(dirname "$0")/.." && pwd)"
WEBSITE="$REPO/website"
ICON="$WEBSITE/img/icon-512.png"

# ── Linux (XDG) ───────────────────────────────────────────────
if [[ "$(uname)" == "Linux" ]]; then
  APPS=~/.local/share/applications
  ICONS=~/.local/share/icons/hicolor/512x512/apps
  DESKTOP=~/Desktop

  mkdir -p "$APPS" "$ICONS"

  cp "$ICON" "$ICONS/astroprecise.png"

  cat > "$APPS/astroprecise.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=AstroPrecise
GenericName=Astrology Web App
Comment=Launch AstroPrecise — birth charts, horoscopes & live sky
Exec=bash -c 'cd "$WEBSITE" && python3 -m http.server 8790 & sleep 2 && xdg-open http://localhost:8790'
Icon=astroprecise
Terminal=false
Categories=Science;Education;
Keywords=astrology;horoscope;birth chart;planets;zodiac;
StartupNotify=true
EOF

  chmod +x "$APPS/astroprecise.desktop"
  update-desktop-database "$APPS" 2>/dev/null || true

  if [[ -d "$DESKTOP" ]]; then
    cp "$APPS/astroprecise.desktop" "$DESKTOP/AstroPrecise.desktop"
    chmod +x "$DESKTOP/AstroPrecise.desktop"
    echo "✓ Desktop shortcut: $DESKTOP/AstroPrecise.desktop"
  fi
  echo "✓ Application menu entry installed"
  echo "✓ Icon installed: $ICONS/astroprecise.png"

# ── macOS ─────────────────────────────────────────────────────
elif [[ "$(uname)" == "Darwin" ]]; then
  APPDIR=~/Applications/AstroPrecise.app
  mkdir -p "$APPDIR/Contents/MacOS" "$APPDIR/Contents/Resources"

  cat > "$APPDIR/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>AstroPrecise</string>
  <key>CFBundleExecutable</key><string>launch</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>CFBundleIdentifier</key><string>io.astroprecise.launcher</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSUIElement</key><false/>
</dict>
</plist>
EOF

  cat > "$APPDIR/Contents/MacOS/launch" << SCRIPT
#!/usr/bin/env bash
cd "$WEBSITE"
python3 -m http.server 8790 &
sleep 2
open http://localhost:8790
SCRIPT
  chmod +x "$APPDIR/Contents/MacOS/launch"
  echo "✓ macOS app bundle: $APPDIR"
  echo "  Drag it to /Applications to add to Launchpad."

else
  echo "Windows detected — use launch.bat or AstroPrecise.url instead."
fi
