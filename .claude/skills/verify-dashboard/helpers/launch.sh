#!/usr/bin/env bash
# Starts the Vite dev server in mock mode (MSW serves the API in the browser) on an isolated port.
set -euo pipefail
source "$(dirname "$0")/env.sh"
mkdir -p "$RUN_DIR" "$EVIDENCE_DIR"

if lsof -iTCP:"$FRONT_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port $FRONT_PORT is already in use; run cleanup.sh if it is ours, otherwise set FRONT_PORT" >&2
  exit 1
fi
if lsof -iTCP:"$MOCK_API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port $MOCK_API_PORT has a listener; unhandled API calls would reach it. Stop it or set MOCK_API_PORT" >&2
  exit 1
fi
[ -d "$REPO_ROOT/node_modules" ] || (cd "$REPO_ROOT" && npm install)

# Shell env beats .env: mock mode on, and the API base points at a port nothing listens on.
(cd "$REPO_ROOT" && VITE_USE_MOCK=true VITE_API_URL="$MOCK_API_URL" exec npx vite --port "$FRONT_PORT" --strictPort) >"$RUN_DIR/frontend.log" 2>&1 &
echo $! >"$RUN_DIR/frontend.pid"

for _ in $(seq 1 60); do
  if curl -sf "$FRONT_URL/" >/dev/null; then
    echo "ready: frontend $FRONT_URL (mock mode, API base $MOCK_API_URL served by MSW; log in $RUN_DIR)"
    exit 0
  fi
  sleep 0.5
done
echo "not ready after 30s; see $RUN_DIR/frontend.log" >&2
exit 1
