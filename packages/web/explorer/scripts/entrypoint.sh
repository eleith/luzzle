#!/bin/sh
set -e

# # Use the centralized Node.js script to get config values.
# # This is much more robust than parsing YAML with shell commands.
APP_ASSETS_URL=$(npx luzzle-tools config --config /app/config.yaml get url.app_assets)
LUZZLE_ASSETS_URL=$(npx luzzle-tools config --config /app/config.yaml get url.luzzle_assets)

# If a value is not found, the script will return an empty string, which is safe.
echo "--- Patching built files with runtime configuration ---"
echo "Found App Assets URL: $APP_ASSETS_URL"
echo "Found Luzzle Assets URL: $LUZZLE_ASSETS_URL"

# Find all relevant files in the build output and replace the placeholders.
find /app/build -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -print0 | xargs -0 -r sed -i \
    -e "s|https://luzzle-app-assets.localhost|$APP_ASSETS_URL|g" \
    -e "s|https://luzzle-assets.localhost|$LUZZLE_ASSETS_URL|g"

echo "--- Patching complete. Starting application. ---"
exec node build
