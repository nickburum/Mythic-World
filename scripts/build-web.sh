#!/usr/bin/env bash
# Assembles the shippable web build (hub + five games) into ios/GameBox/web.
# Only runtime files are copied: no tools, tests, docs or package manifests.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/ios/GameBox/web}"
rm -rf "$OUT"; mkdir -p "$OUT/css" "$OUT/src" "$OUT/art"
copy() { # copy <src-dir> <dest-dir> (tar keeps this dependency-free)
  mkdir -p "$2"
  tar -C "$1" --exclude='./tools' --exclude='./tests' --exclude='./docs' --exclude='./native' --exclude='./node_modules' \
      --exclude='./package.json' --exclude='./package-lock.json' --exclude='./art/screens' --exclude='./art/icon-1024.png' --exclude='.DS_Store' \
      -cf - . | tar -C "$2" -xf -
}
cp "$ROOT/index.html" "$ROOT/switcher.js" "$ROOT/manifest.webmanifest" "$ROOT/sw.js" "$OUT/"
cp "$ROOT/css/"*.css "$OUT/css/"
cp "$ROOT/src/"*.js "$OUT/src/"
cp "$ROOT/art/icon.svg" "$ROOT/art/icon-192.png" "$ROOT/art/icon-512.png" "$ROOT/art/icon-180.png" "$OUT/art/"
for g in melt skip pop orbit sky-temple; do copy "$ROOT/$g" "$OUT/$g"; done
echo "web build → $OUT ($(du -sh "$OUT" | cut -f1), $(find "$OUT" -type f | wc -l) files)"
