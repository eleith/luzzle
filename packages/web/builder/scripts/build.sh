#!/bin/bash
echo "[build] started at $(date)"

bash /app/scripts/pre.build.sh

echo "Syncing archive to database..."
luzzle-web-tools sync --in /app/archive --out /app/assets/piece

bash /app/scripts/post.build.sh

echo "[builder] finished at $(date)"
