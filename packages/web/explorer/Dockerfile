FROM node:22-slim AS builder
WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY src ./src
COPY static ./static
COPY sample ./sample
COPY scripts ./scripts
COPY content ./content
COPY tsconfig.json ./tsconfig.json
COPY svelte.config.js ./svelte.config.js
COPY vite.config.ts ./vite.config.ts

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
RUN touch /app/config.yaml


