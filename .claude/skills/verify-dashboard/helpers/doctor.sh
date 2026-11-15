#!/usr/bin/env bash
# Read-only: is the instance we started up, serving this checkout, and running in mock mode?
source "$(dirname "$0")/env.sh"
ok=0
check() { if eval "$2" >/dev/null 2>&1; then echo "ok    $1"; else echo "FAIL  $1"; ok=1; fi; }
alive() { [ -f "$RUN_DIR/$1.pid" ] && kill -0 "$(cat "$RUN_DIR/$1.pid")" 2>/dev/null; }
check "frontend process is ours and alive" "alive frontend"
check "frontend port is listening" "lsof -iTCP:$FRONT_PORT -sTCP:LISTEN -t"
check "frontend serves the app shell" "curl -sf $FRONT_URL/ | grep -q 'id=\"root\"'"
check "mock mode is on (VITE_USE_MOCK=true)" "curl -sf $FRONT_URL/src/mockMode.ts | grep -q '\"VITE_USE_MOCK\": \"true\"'"
check "API base points at $MOCK_API_URL" "curl -sf $FRONT_URL/src/api/client.ts | grep -q '$MOCK_API_URL'"
check "MSW worker script is served" "curl -sf $FRONT_URL/mockServiceWorker.js | grep -q 'Mock Service Worker'"
check "nothing listens on the mock API port $MOCK_API_PORT" "! lsof -iTCP:$MOCK_API_PORT -sTCP:LISTEN -t"
check "playwright-core installed (run setup.sh)" "[ -d $TOOLS_DIR/node_modules/playwright-core ]"
check "browser found" "node $HELPERS_DIR/find-browser.mjs"
exit $ok
