#!/bin/bash
set -e

if [ -z "$RCLONE_REMOTE" ]; then
  echo "[sync] No RCLONE_REMOTE configured. Skipping cloud sync."
  exit 0
fi

REMOTE_TARGET="${RCLONE_REMOTE}:${RCLONE_REMOTE_PATH}"
LOCAL_TARGET="/app/archive"
WORKDIR="/app/data/rclone"

mkdir -p "$WORKDIR"

echo "[sync] Starting rclone bisync between $LOCAL_TARGET and $REMOTE_TARGET..."

# Temporarily disable 'set -e' to gracefully catch first-run failures
set +e
rclone bisync "$LOCAL_TARGET" "$REMOTE_TARGET" --workdir "$WORKDIR" --verbose
EXIT_CODE=$?
set -e

if [ $EXIT_CODE -ne 0 ]; then
  echo "[sync] Initial bisync failed (exit code $EXIT_CODE). Attempting to establish baseline with --resync..."
  rclone bisync "$LOCAL_TARGET" "$REMOTE_TARGET" --workdir "$WORKDIR" --verbose --resync
fi

echo "[sync] Finished sync process."
