# syntax=docker/dockerfile:1
# Build context: monorepo root. Build with one of:
#   docker build -f packages/web/proxy/Dockerfile --target dev  .
#   docker build -f packages/web/proxy/Dockerfile --target prod .   (default)

FROM nginxinc/nginx-unprivileged:1.27.4-alpine AS base
USER root
RUN rm -f /etc/nginx/conf.d/default.conf && \
    chmod 777 /etc/nginx/conf.d && \
    mkdir -p /etc/nginx/templates && \
    chmod -R 777 /etc/nginx/templates
COPY --chmod=664 packages/web/proxy/templates/default.conf.template /etc/nginx/templates/default.conf.template
USER 101

# --- dev ---------------------------------------------------------------------
FROM base AS dev
ENV LUZZLE_PROXY_EXPLORER_UPSTREAM=luzzle-dev-web:5173
ENV LUZZLE_PROXY_LSP_UPSTREAM=luzzle-dev-lsp:9001
ENV LUZZLE_DEV=true
ENV LUZZLE_PROXY_ACCESS_LOG=/tmp/logs/access.log
ENV LUZZLE_PROXY_ERROR_LOG=/tmp/logs/error.log

# --- prod (default) ----------------------------------------------------------
FROM base AS prod
ENV LUZZLE_PROXY_EXPLORER_UPSTREAM=luzzle-web:3000
ENV LUZZLE_PROXY_LSP_UPSTREAM=luzzle-lsp:9001
ENV LUZZLE_DEV=false
ENV LUZZLE_PROXY_ACCESS_LOG=/dev/stdout
ENV LUZZLE_PROXY_ERROR_LOG=/dev/stderr
