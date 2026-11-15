#!/usr/bin/env bash
# One-time: installs playwright-core under $VERIFY_HOME/tools and prints the browser it will drive.
set -euo pipefail
source "$(dirname "$0")/env.sh"
mkdir -p "$TOOLS_DIR" "$RUN_DIR" "$EVIDENCE_DIR"
if [ ! -d "$TOOLS_DIR/node_modules/playwright-core" ]; then
  (cd "$TOOLS_DIR" && npm init -y >/dev/null && npm install playwright-core >/dev/null)
fi
node "$HELPERS_DIR/find-browser.mjs"
