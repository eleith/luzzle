#!/bin/bash
echo "[deploy] started at $(date)"

bash /app/scripts/pre.deploy.sh

bash /app/scripts/post.deploy.sh

echo "[deploy] finished at $(date)"
