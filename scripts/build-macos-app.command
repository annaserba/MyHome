#!/bin/zsh
cd "$(dirname "$0")/.."

APP_NAME="MyHome"
APP_DIR="$HOME/Desktop/$APP_NAME.app"
CONTENTS="$APP_DIR/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"
BINARY="$MACOS/MyHomeTV"

rm -rf "$APP_DIR"
mkdir -p "$MACOS" "$RESOURCES"

if [ ! -f "assets/icon.icns" ]; then
  python3 scripts/generate-icon.py
fi

swiftc macos/MyHomeTV.swift -o "$BINARY" -framework Cocoa -framework WebKit

cat > "$CONTENTS/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>MyHomeTV</string>
  <key>CFBundleIdentifier</key>
  <string>com.myhome.tv.panel</string>
  <key>CFBundleName</key>
  <string>MyHome</string>
  <key>CFBundleDisplayName</key>
  <string>MyHome</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>CFBundleIconFile</key>
  <string>icon.icns</string>
</dict>
</plist>
PLIST

cp assets/icon.icns "$RESOURCES/"

chmod +x "$BINARY"
osascript -e 'display notification "MyHome создан на рабочем столе" with title "MyHome"'
