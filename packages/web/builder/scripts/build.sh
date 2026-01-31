#!/bin/bash
echo "Luzzle builder started at $(date)"

bash /app/scripts/pre.build.sh

echo "Syncing archive to database..."
luzzle-web-tools sync --config /app/config.yaml

echo "Building database web tables"
luzzle-web-tools sqlite --config /app/config.yaml

echo "Building new assets..."
luzzle-web-tools assets --config /app/config.yaml --luzzle /app/data/luzzle.sqlite --out /app/assets

echo "Building new opengraph images..."
luzzle-web-tools opengraph --config /app/config.yaml --luzzle /app/data/luzzle.sqlite --out /app/assets

bash /app/scripts/post.build.sh

echo "Luzzle builder finished at $(date)"
