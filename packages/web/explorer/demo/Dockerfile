# --- STAGE 1: Builder ---
FROM ghcr.io/eleith/luzzle-web:latest AS builder
WORKDIR /app

COPY config.yaml ./config.yaml
COPY content/ ./content/
COPY static/ ./static/

RUN pnpm run build
RUN pnpm --filter @luzzle/web deploy --prod --legacy /deploy

# --- STAGE 2: Production Runtime ---
FROM node:24-alpine
WORKDIR /app

COPY --from=builder /deploy ./
COPY config.yaml ./config.yaml

EXPOSE 3000
CMD ["node", "build/index.js"]
