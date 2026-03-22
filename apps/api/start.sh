#!/bin/sh
set -eu

APP_DIST="/app/apps/api/dist/index.js"

if [ ! -f "$APP_DIST" ]; then
  echo "[FATAL] API entry not found: $APP_DIST" >&2
  echo "[FATAL] Ensure the image builds apps/api before runtime." >&2
  exit 1
fi

exec node "$APP_DIST"
