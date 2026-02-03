#!/bin/bash
echo "Post build started at $(date)"

echo "Purge Nginx cache..."
rm -rf /app/nginx/*

echo "Post build finished at $(date)"
