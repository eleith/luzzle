# --- STAGE 1: Builder ---
FROM ghcr.io/eleith/luzzle-web:latest AS builder
WORKDIR /app

COPY config/config.yaml ./config/config.yaml
RUN ln -sfn config/config.yaml config.yaml
COPY content/ ./content/
COPY static/ ./static/

RUN pnpm run build
RUN pnpm --filter @luzzle/web deploy --prod --legacy /deploy

# --- STAGE 2: Production Runtime ---
FROM node:24-alpine
WORKDIR /app

COPY --from=builder /deploy ./
COPY content/home.md content/feed-about.md ./content/
COPY config/config.yaml ./config/config.yaml
RUN ln -sfn config/config.yaml config.yaml

EXPOSE 3000
CMD ["node", "scripts/start-server.js"]
