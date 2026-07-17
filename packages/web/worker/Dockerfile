# syntax=docker/dockerfile:1
# Build context: monorepo root. Build with one of:
#   docker build -f packages/web/worker/Dockerfile --target dev  .
#   docker build -f packages/web/worker/Dockerfile --target prod .   (default)

FROM node:26-alpine AS base
WORKDIR /m
RUN corepack enable

# --- dev: full monorepo install, tsc at container start ----------------------
FROM base AS dev
RUN apk add --no-cache bash ca-certificates
COPY --from=rclone/rclone:latest /usr/local/bin/rclone /usr/bin/rclone
COPY . .
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile
RUN pnpm --filter @luzzle/core --filter @luzzle/web.config --filter @luzzle/web.theme --filter @luzzle/web.db --filter @luzzle/web.jobs --filter @luzzle/web.pieces build
WORKDIR /m/packages/web/worker
RUN mkdir -p queue archive assets rclone dist && \
    chgrp 0 . queue archive assets rclone && \
    chmod g+w . queue archive assets rclone && \
    chmod -R 777 dist
EXPOSE 9000
CMD ["pnpm", "run", "dev"]

# --- builder: compile worker -------------------------------------------------
FROM base AS builder
COPY . .
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile
RUN pnpm --filter @luzzle/core --filter @luzzle/web.config --filter @luzzle/web.theme --filter @luzzle/web.db --filter @luzzle/web.jobs --filter @luzzle/web.pieces build
RUN pnpm --filter @luzzle/web.worker build

# --- pruner: deploy worker prod bundle (no dev deps) -------------------------
FROM builder AS pruner
RUN pnpm --filter @luzzle/web.worker --prod deploy --legacy /pruned

# --- prod (default) ----------------------------------------------------------
FROM base AS prod
WORKDIR /app
RUN apk add --no-cache bash ca-certificates
COPY --from=rclone/rclone:latest /usr/local/bin/rclone /usr/bin/rclone
RUN mkdir -p /app/queue /app/archive /app/assets /app/rclone && \
    chgrp 0 /app /app/queue /app/archive /app/assets /app/rclone && \
    chmod g+w /app /app/queue /app/archive /app/assets /app/rclone
COPY --from=pruner --chown=:0 --chmod=775 /pruned/dist           /app/dist
COPY --from=pruner --chown=:0 --chmod=775 /pruned/node_modules   /app/node_modules
COPY --from=pruner --chown=:0 --chmod=775 /pruned/package.json   /app/package.json
RUN mkdir -p /app/dist/src/pieces/.compiled && \
    chgrp 0 /app/dist/src/pieces/.compiled && \
    chmod 777 /app/dist/src/pieces/.compiled
EXPOSE 9000
CMD ["node", "/app/dist/src/index.js"]
