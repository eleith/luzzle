#!/bin/bash
set -e

RCLONE_REMOTE=$(luzzle-web-tools config get sync.remote 2>/dev/null || echo "")
RCLONE_REMOTE_PATH=$(luzzle-web-tools config get sync.path 2>/dev/null || echo "")
RCLONE_CONFIG_PATH=$(luzzle-web-tools config get sync.config)

if [ -z "$RCLONE_REMOTE" ]; then
  echo "[sync] No sync.remote configured. Skipping cloud sync."
  exit 0
fi

REMOTE_TARGET="${RCLONE_REMOTE}:${RCLONE_REMOTE_PATH}"
LOCAL_TARGET="/app/archive"
WORKDIR="/app/rclone/bisync"

mkdir -p "$WORKDIR"

# Ensure the remote target exists (rclone mkdir is a no-op if it already exists)
rclone mkdir "$REMOTE_TARGET" --config "$RCLONE_CONFIG_PATH"

if ! ls "$WORKDIR"/*.lst >/dev/null 2>&1; then
  echo "[sync] No existing baseline found. Establishing initial baseline with --resync..."
  rclone bisync "$LOCAL_TARGET" "$REMOTE_TARGET" \
    --config "$RCLONE_CONFIG_PATH" \
    --workdir "$WORKDIR" \
    --verbose \
    --resync
else
  echo "[sync] Existing baseline found. Starting delta sync..."
  rclone bisync "$LOCAL_TARGET" "$REMOTE_TARGET" \
    --config "$RCLONE_CONFIG_PATH" \
    --workdir "$WORKDIR" \
    --verbose \
    --resilient \
    --recover \
    --max-lock 2m
fi

echo "[sync] Finished sync process."
