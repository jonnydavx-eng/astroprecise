#!/usr/bin/env bash
# AstroPrecise — one-shot preview launcher
# Usage: ./preview.sh [--device | --emulator | --build-only]
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APK="$SCRIPT_DIR/app/build/outputs/apk/debug/app-debug.apk"
PKG="com.astroprecise"
ACTIVITY="com.astroprecise.MainActivity"

# ── colours ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}▸ $*${NC}"; }
ok()    { echo -e "${GREEN}✓ $*${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $*${NC}"; }
error() { echo -e "${RED}✗ $*${NC}"; }

MODE="${1:-auto}"

# ── sanity checks ─────────────────────────────────────────────────────
check_java() {
  if ! command -v java &>/dev/null; then
    error "Java not found. Install JDK 17+ (https://adoptium.net)"
    exit 1
  fi
  JAVA_VER=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d. -f1)
  if [ "$JAVA_VER" -lt 17 ]; then
    error "Java 17+ required (found Java $JAVA_VER)"
    exit 1
  fi
  ok "Java $JAVA_VER found"
}

check_sdk() {
  # Honour explicit ANDROID_HOME / ANDROID_SDK_ROOT, then try common paths
  if [ -z "$ANDROID_HOME" ]; then
    for p in \
      "$HOME/Android/Sdk" \
      "$HOME/Library/Android/sdk" \
      "/usr/local/lib/android/sdk" \
      "/opt/android-sdk"; do
      if [ -d "$p" ]; then
        export ANDROID_HOME="$p"
        break
      fi
    done
  fi

  if [ -z "$ANDROID_HOME" ] || [ ! -d "$ANDROID_HOME" ]; then
    error "Android SDK not found."
    echo ""
    echo "  Install Android Studio from https://developer.android.com/studio"
    echo "  then re-run this script — it will pick up the SDK automatically."
    echo ""
    echo "  Or set:  export ANDROID_HOME=/path/to/your/sdk"
    exit 1
  fi
  ok "Android SDK at $ANDROID_HOME"
}

write_local_properties() {
  if [ ! -f "$SCRIPT_DIR/local.properties" ]; then
    echo "sdk.dir=$ANDROID_HOME" > "$SCRIPT_DIR/local.properties"
    ok "Created local.properties"
  fi
}

# ── build ─────────────────────────────────────────────────────────────
build_apk() {
  info "Building debug APK …"
  cd "$SCRIPT_DIR"
  ./gradlew assembleDebug --quiet
  if [ ! -f "$APK" ]; then
    error "Build failed — APK not found at $APK"
    exit 1
  fi
  ok "APK built: $APK"
}

# ── device install ────────────────────────────────────────────────────
install_and_launch() {
  local serial="$1"
  ADB_CMD="$ANDROID_HOME/platform-tools/adb"
  [ -f "$ADB_CMD" ] || ADB_CMD="adb"

  info "Installing on ${serial:-default device} …"
  $ADB_CMD ${serial:+-s "$serial"} install -r "$APK"
  ok "Installed"

  info "Launching AstroPrecise …"
  $ADB_CMD ${serial:+-s "$serial"} shell am start -n "$PKG/$ACTIVITY"
  ok "App launched — check your device/emulator"
}

detect_target() {
  ADB_CMD="$ANDROID_HOME/platform-tools/adb"
  [ -f "$ADB_CMD" ] || ADB_CMD="adb"

  if ! command -v "$ADB_CMD" &>/dev/null && [ "$ADB_CMD" = "adb" ]; then
    warn "adb not found in PATH or SDK platform-tools — skipping device install"
    echo ""
    echo "  APK is at: $APK"
    echo "  Copy it to your phone and open it to install."
    return
  fi

  DEVICES=$("$ADB_CMD" devices 2>/dev/null | grep -E "^[^\s]+\s+device$" | awk '{print $1}')
  COUNT=$(echo "$DEVICES" | grep -c . || true)

  if [ "$COUNT" -eq 0 ]; then
    warn "No Android device/emulator connected."
    echo ""
    echo "  Start an emulator in Android Studio, or plug in a phone with USB debugging."
    echo "  Then re-run: ./preview.sh"
    echo ""
    echo "  APK is at: $APK"
  elif [ "$COUNT" -eq 1 ]; then
    install_and_launch "$DEVICES"
  else
    echo ""
    echo "  Multiple devices found:"
    echo "$DEVICES" | nl -w2 -s'. '
    read -rp "  Pick device number: " IDX
    SERIAL=$(echo "$DEVICES" | sed -n "${IDX}p")
    install_and_launch "$SERIAL"
  fi
}

# ── landing page preview ──────────────────────────────────────────────
serve_landing() {
  LANDING="$SCRIPT_DIR/landing/index.html"
  if [ ! -f "$LANDING" ]; then
    return
  fi
  if command -v python3 &>/dev/null; then
    PORT=8787
    info "Serving landing page preview at http://localhost:$PORT"
    (cd "$SCRIPT_DIR/landing" && python3 -m http.server $PORT --bind 127.0.0.1 &>/dev/null &)
    sleep 1
    if command -v xdg-open &>/dev/null; then
      xdg-open "http://localhost:$PORT" &>/dev/null &
    elif command -v open &>/dev/null; then
      open "http://localhost:$PORT"
    else
      ok "Open http://localhost:$PORT in your browser"
    fi
  fi
}

# ── main ──────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   AstroPrecise — Preview Launcher    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

case "$MODE" in
  --landing)
    serve_landing
    ;;
  --build-only)
    check_java
    check_sdk
    write_local_properties
    build_apk
    echo ""
    ok "APK ready at: $APK"
    ;;
  *)
    check_java
    check_sdk
    write_local_properties
    build_apk
    serve_landing
    detect_target
    ;;
esac

echo ""
