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

LOGFILE=$(mktemp)

# Temporarily disable 'set -e' to gracefully catch failures
set +e
# Pipe stderr to stdout (2>&1) so tee captures everything
rclone bisync "$LOCAL_TARGET" "$REMOTE_TARGET" --workdir "$WORKDIR" --verbose 2>&1 | tee "$LOGFILE"
# Capture the exit code of rclone, not tee
EXIT_CODE=${PIPESTATUS[0]}
set -e

if [ $EXIT_CODE -ne 0 ]; then
  if grep -q -i "Must run --resync" "$LOGFILE" || grep -q -i "cannot find prior Path" "$LOGFILE"; then
    echo "[sync] Initial bisync baseline missing or broken. Attempting to establish baseline with --resync..."
    rclone bisync "$LOCAL_TARGET" "$REMOTE_TARGET" --workdir "$WORKDIR" --verbose --resync
  else
    echo "[sync] Sync failed with exit code $EXIT_CODE. Aborting."
    rm -f "$LOGFILE"
    exit $EXIT_CODE
  fi
fi

rm -f "$LOGFILE"
echo "[sync] Finished sync process."
