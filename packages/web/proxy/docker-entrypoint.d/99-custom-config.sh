#!/bin/sh
# Custom script to generate nginx.conf from template with specific env vars

set -e

echo "Generating nginx.conf from template..."
envsubst '${LUZZLE_EXPLORER_HOST} ${LUZZLE_EXPLORER_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Configuration generated."
