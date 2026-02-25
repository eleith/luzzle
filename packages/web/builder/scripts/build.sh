#!/bin/bash
echo "[build] started at $(date)"

bash /app/scripts/pre.build.sh

echo "Syncing archive to database..."
luzzle-web-tools sync --in /app/archive

echo "Building database web tables"
luzzle-web-tools sqlite

echo "Building new assets..."
luzzle-web-tools assets --out /app/assets/pieces --in /app/archive

echo "Building new opengraph images..."
luzzle-web-tools opengraph --out /app/assets/pieces

bash /app/scripts/post.build.sh

echo "[builder] finished at $(date)"
