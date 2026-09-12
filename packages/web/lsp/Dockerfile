# syntax=docker/dockerfile:1
# Build context: monorepo root. Build with one of:
#   docker build -f packages/web/lsp/Dockerfile --target dev  .
#   docker build -f packages/web/lsp/Dockerfile --target prod .   (default)

FROM node:26-alpine AS base
WORKDIR /m
RUN npm install -g pnpm@11.2.2

# --- dev: full monorepo install, runs @luzzle/lsp from workspace -------------
FROM base AS dev
COPY . .
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile
RUN pnpm --filter @luzzle/lsp build
RUN chmod +x /m/apps/lsp/dist/index.js && \
    ln -s /m/apps/lsp/dist/index.js /usr/local/bin/luzzle-lsp
ENV PATH="/m/apps/lsp/node_modules/.bin:${PATH}"
WORKDIR /m/packages/web/lsp
RUN mkdir -p archive && \
    chgrp 0 . archive && \
    chmod g+w . archive
EXPOSE 9001
CMD ["node", "server.js"]

# --- pruner: build @luzzle/lsp + deploy both prod bundles --------------------
FROM base AS pruner
COPY . .
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile
RUN pnpm --filter @luzzle/lsp build
RUN pnpm --filter @luzzle/web.lsp --prod deploy --legacy /pruned
RUN pnpm --filter @luzzle/lsp --prod deploy --legacy /pruned-lsp

# --- prod (default): @luzzle/lsp + yaml-language-server built from source ----
FROM base AS prod
WORKDIR /app
COPY --from=pruner --chown=:0 --chmod=775 /pruned-lsp /opt/luzzle-lsp
RUN chmod +x /opt/luzzle-lsp/dist/index.js && \
    ln -s /opt/luzzle-lsp/dist/index.js /usr/local/bin/luzzle-lsp
ENV PATH="/opt/luzzle-lsp/node_modules/.bin:${PATH}"
COPY --from=pruner --chown=:0 --chmod=775 /pruned /app
RUN mkdir -p /app/archive && \
    chgrp 0 /app /app/archive && \
    chmod g+w /app /app/archive
EXPOSE 9001
CMD ["node", "/app/server.js"]
