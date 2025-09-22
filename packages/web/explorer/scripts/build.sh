#!/bin/sh
# Exit script if any command fails
set -e

echo "--- Starting Luzzle Explorer Build ---"

echo "Running build checks..."
npm run check

echo "Building SvelteKit application..."
npm run build

echo "Pruning development dependencies..."
npm prune --omit=dev

echo "--- Build Complete ---"
