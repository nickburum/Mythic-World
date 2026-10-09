#!/usr/bin/env bash
# One command from a fresh Mac to an Xcode project you can run on your iPhone:
#   bash ios/bootstrap.sh
# Installs XcodeGen if needed, assembles the web build, generates GameBox.xcodeproj and opens it.
set -euo pipefail
cd "$(dirname "$0")"
# Optional: bash ios/bootstrap.sh --team ABCDE12345 --bundle com.you.gamebox   (writes them into project.yml once)
while [ $# -gt 0 ]; do case "$1" in
  --team) sed -i '' "s/DEVELOPMENT_TEAM: \"[A-Z0-9]*\"/DEVELOPMENT_TEAM: \"$2\"/" project.yml; shift 2;;
  --bundle) sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER: .*/PRODUCT_BUNDLE_IDENTIFIER: $2/; s/CFBundleURLName: .*/CFBundleURLName: $2/" project.yml; shift 2;;
  *) shift;; esac; done
if ! command -v xcodegen >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then brew install xcodegen; else echo "Install Homebrew (https://brew.sh) or XcodeGen (https://github.com/yonaskolb/XcodeGen) first."; exit 1; fi
fi
bash ../scripts/build-web.sh
# App icon from the hub's generated art
ICON_DIR="GameBox/Assets.xcassets/AppIcon.appiconset"; mkdir -p "$ICON_DIR"
cp ../art/icon-1024.png "$ICON_DIR/icon-1024.png"
cat > "$ICON_DIR/Contents.json" <<'JSON'
{ "images": [ { "filename": "icon-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024" } ], "info": { "author": "xcode", "version": 1 } }
JSON
cat > "GameBox/Assets.xcassets/Contents.json" <<'JSON'
{ "info": { "author": "xcode", "version": 1 } }
JSON
xcodegen generate
echo
echo "✔ GameBox.xcodeproj generated."
echo "  1. Open it, select the GameBox target ▸ Signing & Capabilities ▸ pick your Team."
echo "  2. Plug in your iPhone, choose it as the run destination, press ▶."
echo "  See ios/README.md for TestFlight."
if command -v open >/dev/null 2>&1; then open GameBox.xcodeproj; fi
