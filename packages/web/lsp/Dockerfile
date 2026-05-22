# syntax=docker/dockerfile:1
# Build context: monorepo root. Build with one of:
#   docker build -f packages/web/lsp/Dockerfile --target dev  .
#   docker build -f packages/web/lsp/Dockerfile --target prod .   (default)

FROM node:24-alpine AS base
WORKDIR /m
RUN corepack enable

# --- dev: full monorepo install, runs @luzzle/lsp from workspace -------------
FROM base AS dev
COPY . .
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile
RUN pnpm --filter @luzzle/lsp build
RUN chmod +x /m/packages/lsp/dist/index.js && \
    ln -s /m/packages/lsp/dist/index.js /usr/local/bin/luzzle-lsp
RUN npm install -g yaml-language-server
WORKDIR /m/packages/web/lsp
RUN mkdir -p archive && \
    chgrp 0 . archive && \
    chmod g+w . archive
EXPOSE 9001
CMD ["node", "server.js"]

# --- pruner: deploy web.lsp prod bundle --------------------------------------
FROM base AS pruner
COPY . .
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile
RUN pnpm --filter @luzzle/web.lsp --prod deploy /pruned

# --- prod (default): registry-installed @luzzle/lsp + web.lsp own bundle -----
FROM base AS prod
WORKDIR /app
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm install -g @luzzle/lsp@0.0.1 yaml-language-server \
    && npm cache clean --force
COPY --from=pruner --chown=:0 --chmod=775 /pruned /app
RUN mkdir -p /app/archive && \
    chgrp 0 /app /app/archive && \
    chmod g+w /app /app/archive
EXPOSE 9001
CMD ["node", "/app/server.js"]
