#!/bin/bash
set -e

echo "[publish] started at $(date)"

bash /app/scripts/sync.sh

bash /app/scripts/pre.publish.sh

echo "Syncing archive to database..."
luzzle-web-tools sync --in /app/archive --out /app/assets/pieces

bash /app/scripts/post.publish.sh

echo "[publish] finished at $(date)"
