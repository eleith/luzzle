# syntax=docker/dockerfile:1
# Build context: monorepo root. Build with one of:
#   docker build -f apps/web/Dockerfile --target dev  .
#   docker build -f apps/web/Dockerfile --target prod .   (default)


FROM node:26-alpine AS base
WORKDIR /m
RUN npm install -g pnpm@11.2.2

# --- dev: full monorepo install, manager.js runs `pnpm run dev` --------------
FROM base AS dev
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @luzzle/core --filter @luzzle/web.config --filter @luzzle/web.theme --filter @luzzle/web.db --filter @luzzle/web.jobs --filter @luzzle/web.pieces --filter @luzzle/web.templates build
WORKDIR /m/apps/web
RUN mkdir -p assets/pieces assets/build data content build config \
             node_modules/.cache node_modules/.vite .svelte-kit && \
    touch config/config.yaml .env && \
    ln -sfn config/config.yaml config.yaml && \
    chmod 777 . config/config.yaml .env package.json && \
    chmod -R 777 assets data content build \
                 node_modules/.cache node_modules/.vite .svelte-kit
EXPOSE 3000
ENTRYPOINT ["node", "scripts/manager.js"]

# --- builder: compile and deploy the stock application ----------------------
FROM base AS builder
COPY . .
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile --filter @luzzle/web...
RUN pnpm --filter @luzzle/core --filter @luzzle/web.config --filter @luzzle/web.theme --filter @luzzle/web.db --filter @luzzle/web.jobs --filter @luzzle/web.pieces --filter @luzzle/web.templates build
RUN pnpm --filter @luzzle/web build
RUN pnpm --filter @luzzle/web deploy --prod --legacy /deploy

# --- prod (default): standalone runtime, no startup build --------------------
FROM node:26-alpine AS prod
WORKDIR /app
COPY --from=builder /deploy ./
RUN mkdir -p archive assets/pieces content data config && \
    touch config/config.yaml && \
    ln -s config/config.yaml config.yaml && \
    chmod 777 archive assets/pieces data
USER node
EXPOSE 3000
ENTRYPOINT ["node", "scripts/start-server.js"]
