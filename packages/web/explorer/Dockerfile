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
RUN pnpm --filter @luzzle/core --filter @luzzle/web.config --filter @luzzle/web.theme --filter @luzzle/web.db --filter @luzzle/web.jobs --filter @luzzle/web.pieces build
WORKDIR /m/packages/web/explorer
RUN mkdir -p assets/pieces assets/build data content build \
             node_modules/.cache node_modules/.vite .svelte-kit && \
    touch config.yaml .env && \
    chmod 777 . config.yaml .env package.json && \
    chmod -R 777 assets data content build \
                 node_modules/.cache node_modules/.vite .svelte-kit
EXPOSE 3000
ENTRYPOINT ["node", "scripts/manager.js"]

# --- builder: install only explorer's dependency tree and build workspace deps
FROM base AS builder
COPY . .
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile --filter @luzzle/web...
RUN pnpm --filter @luzzle/core --filter @luzzle/web.config --filter @luzzle/web.theme --filter @luzzle/web.db --filter @luzzle/web.jobs --filter @luzzle/web.pieces build

# --- prod (default) ----------------------------------------------------------
FROM base AS prod
WORKDIR /m/packages/web/explorer
COPY --from=builder /m /m
RUN ln -s /m/packages/web/explorer /app
RUN mkdir -p assets/pieces assets/build data content build \
             node_modules/.cache node_modules/.vite .svelte-kit && \
    touch config.yaml .env && \
    chmod 777 . config.yaml .env package.json && \
    chmod -R 777 assets data content build \
                 node_modules/.cache node_modules/.vite .svelte-kit
EXPOSE 3000
ENTRYPOINT ["node", "scripts/manager.js"]
