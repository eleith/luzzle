#!/bin/bash
echo "[build] started at $(date)"

bash /app/scripts/pre.build.sh

echo "Syncing archive to database..."
luzzle-web-tools sync --config /app/config.yaml

echo "Building database web tables"
luzzle-web-tools sqlite --config /app/config.yaml

echo "Building new assets..."
luzzle-web-tools assets --config /app/config.yaml --out /app/assets

echo "Building new opengraph images..."
luzzle-web-tools opengraph --config /app/config.yaml --out /app/assets

bash /app/scripts/post.build.sh

echo "[builder] finished at $(date)"
