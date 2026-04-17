#!/usr/bin/env sh
set -eu

PORT="${PORT:-8000}"
SESSION="${YTB_SESSION_ID:-${SESSION:-}}"
export PORT
export YTB_SESSION_ID="$SESSION"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

node "$SCRIPT_DIR/serve.mjs" --port "$PORT" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

sleep 2
node "$SCRIPT_DIR/open.mjs" site

printf 'Home: http://localhost:%s/\n' "$PORT"
printf 'Portal: http://localhost:%s/portal\n' "$PORT"

if [ -n "$SESSION" ]; then
  printf 'Overlay: http://localhost:%s/overlay?session=%s\n' "$PORT" "$SESSION"
fi

wait "$SERVER_PID"
