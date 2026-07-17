# syntax=docker/dockerfile:1
# Build context: monorepo root. Build with one of:
#   docker build -f apps/web/Dockerfile --target dev  .
#   docker build -f apps/web/Dockerfile --target prod .   (default)


FROM node:26-alpine AS base
WORKDIR /m
RUN corepack enable

# --- dev: full monorepo install, manager.js runs `pnpm run dev` --------------
FROM base AS dev
COPY . .
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile
RUN pnpm --filter @luzzle/core --filter @luzzle/web.config --filter @luzzle/web.theme --filter @luzzle/web.db --filter @luzzle/web.jobs --filter @luzzle/web.pieces build
WORKDIR /m/apps/web
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
WORKDIR /m/apps/web
COPY --from=builder /m /m
RUN ln -s /m/apps/web /app
RUN mkdir -p assets/pieces assets/build data content build \
             node_modules/.cache node_modules/.vite .svelte-kit && \
    touch config.yaml .env && \
    chmod 777 . config.yaml .env package.json && \
    chmod -R 777 assets data content build \
                 node_modules/.cache node_modules/.vite .svelte-kit
EXPOSE 3000
ENTRYPOINT ["node", "scripts/manager.js"]
