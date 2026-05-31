#!/bin/zsh
cd "$(dirname "$0")/.."

APP_DIR="$HOME/Desktop/MyHome TV.app"
PLIST="$HOME/Library/LaunchAgents/com.myhome.tv.panel.plist"

if [ ! -d "$APP_DIR" ]; then
  ./scripts/build-macos-app.command
fi

mkdir -p "$HOME/Library/LaunchAgents" logs

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.myhome.tv.panel</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/open</string>
    <string>$APP_DIR</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>/Users/serba/IdeaProjects/MyHome/logs/panel-autostart.out.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/serba/IdeaProjects/MyHome/logs/panel-autostart.err.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST" >/dev/null 2>&1 || true
launchctl load "$PLIST"
osascript -e 'display notification "Автозапуск MyHome TV включён" with title "MyHome TV"'
