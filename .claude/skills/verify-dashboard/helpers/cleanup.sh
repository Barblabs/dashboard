#!/usr/bin/env bash
# Stops only the processes launch.sh started (by pid file). Evidence and logs are kept.
source "$(dirname "$0")/env.sh"
for name in frontend; do
  pidfile="$RUN_DIR/$name.pid"
  [ -f "$pidfile" ] || continue
  pid="$(cat "$pidfile")"
  # npx/vite spawn children: stop the whole tree rooted at the pid we recorded.
  pkill -TERM -P "$pid" 2>/dev/null || true
  kill -TERM "$pid" 2>/dev/null || true
  rm -f "$pidfile"
done
sleep 1
lsof -iTCP:"$FRONT_PORT" -sTCP:LISTEN >/dev/null 2>&1 && echo "warning: port $FRONT_PORT still busy" >&2
echo "stopped. evidence kept in $EVIDENCE_DIR"
