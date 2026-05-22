# syntax=docker/dockerfile:1
# Build context: monorepo root. Build with one of:
#   docker build -f packages/web/explorer/Dockerfile --target dev  .
#   docker build -f packages/web/explorer/Dockerfile --target prod .   (default)

FROM node:24-alpine AS base
WORKDIR /m
RUN corepack enable

# --- dev: full monorepo install, manager.js runs `pnpm run dev` --------------
FROM base AS dev
COPY . .
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile
RUN pnpm --filter @luzzle/web.config build
WORKDIR /m/packages/web/explorer
RUN mkdir -p assets/pieces assets/build data content build \
             node_modules/.cache node_modules/.vite .svelte-kit && \
    touch config.yaml .env && \
    chmod 777 . config.yaml .env package.json && \
    chmod -R 777 assets data content build \
                 node_modules/.cache node_modules/.vite .svelte-kit
EXPOSE 3000
ENTRYPOINT ["node", "scripts/manager.js"]

# --- pruner: deploy explorer as a self-contained bundle ----------------------
# Full deploy (NOT --prod) because manager.js runs `pnpm run build` at startup,
# which needs vite/svelte-check/etc. The image is intentionally larger to
# preserve the existing build-at-startup behavior driven by runtime config.yaml.
FROM base AS pruner
COPY . .
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile
RUN pnpm --filter @luzzle/web.config build
RUN pnpm --filter @luzzle/web deploy --legacy /pruned

# --- prod (default) ----------------------------------------------------------
FROM base AS prod
WORKDIR /app
COPY --from=pruner /pruned /app
RUN mkdir -p /app/assets/pieces /app/assets/build /app/data /app/content /app/build \
             /app/node_modules/.cache /app/node_modules/.vite /app/.svelte-kit && \
    touch /app/config.yaml /app/.env && \
    chmod 777 /app /app/config.yaml /app/.env /app/package.json && \
    chmod -R 777 /app/assets /app/data /app/content /app/build \
                 /app/node_modules/.cache /app/node_modules/.vite /app/.svelte-kit
EXPOSE 3000
ENTRYPOINT ["node", "scripts/manager.js"]
