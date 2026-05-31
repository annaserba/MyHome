#!/bin/zsh
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SHORTCUT="$HOME/Desktop/Запустить MyHome TV.command"
cd "$PROJECT_DIR"
./scripts/build-macos-app.command
cat > "$SHORTCUT" <<EOF
#!/bin/zsh
open "$HOME/Desktop/MyHome TV.app"
EOF
chmod +x "$PROJECT_DIR/scripts/start.command" "$PROJECT_DIR/scripts/start-background.command" "$PROJECT_DIR/scripts/build-macos-app.command" "$PROJECT_DIR/scripts/install-autostart.command" "$SHORTCUT"
osascript -e 'display notification "Ярлык создан на рабочем столе" with title "MyHome TV"'
