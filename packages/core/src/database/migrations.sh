#!/usr/bin/bash

TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
NAME=$1

if [ -z "$NAME" ]; then
  echo "please provide a name for the migration"
  exit 1
else
  cp ./src/database/migrations/template.txt "./src/database/migrations/$TIMESTAMP-$NAME.ts"
  echo "created ./src/database/migrations/$TIMESTAMP-$NAME.ts"
fi
