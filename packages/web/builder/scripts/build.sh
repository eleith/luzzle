#!/bin/bash
set -e

echo "[build] started at $(date)"

bash /app/scripts/sync.sh

bash /app/scripts/pre.build.sh

echo "Syncing archive to database..."
luzzle-web-tools sync --in /app/archive --out /app/assets/pieces

bash /app/scripts/post.build.sh

echo "[builder] finished at $(date)"
