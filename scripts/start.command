#!/bin/zsh
cd "$(dirname "$0")/.."
export PATH="$HOME/.nvm/versions/node/v25.2.1/bin:$PATH"

if [ ! -x "$(command -v node)" ]; then
  osascript -e 'display dialog "Node.js не найден." buttons {"OK"} default button "OK"'
  exit 1
fi
npm run build
node server/index.ts
