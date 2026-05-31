#!/bin/zsh
cd "$(dirname "$0")/.."

PORT="${PORT:-4173}"
URL="http://localhost:$PORT/api/config"
LOG_DIR="$PWD/logs"
LOG_FILE="$LOG_DIR/myhome.log"

NVM_NODE="/Users/serba/.nvm/versions/node/v25.2.1/bin/node"
export PATH="/Users/serba/.nvm/versions/node/v25.2.1/bin:$PATH"

if [ -f ".env" ]; then
  ENV_PORT="$(grep -E '^PORT=' .env | tail -1 | cut -d '=' -f 2- | tr -d '\"' | tr -d "'")"
  if [ -n "$ENV_PORT" ]; then
    PORT="$ENV_PORT"
    URL="http://localhost:$PORT/api/config"
  fi
fi

mkdir -p "$LOG_DIR"
"$NVM_NODE" node_modules/.bin/vite build >> "$LOG_FILE" 2>&1

if ! curl -fsS "$URL" >/dev/null 2>&1; then
  nohup "$NVM_NODE" server/index.ts >> "$LOG_FILE" 2>&1 &
fi
