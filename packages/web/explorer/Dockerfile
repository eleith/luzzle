FROM node:20.18.0-slim
WORKDIR /app

COPY package.json ./package.json
COPY web.package-lock.json ./package-lock.json
COPY src ./src
COPY static ./static
COPY sample ./sample
COPY tsconfig.json ./tsconfig.json
COPY svelte.config.js ./svelte.config.js
COPY vite.config.ts ./vite.config.ts

COPY .env.sample ./.env.local

COPY scripts/build.sh ./build.sh
RUN chmod +x ./build.sh

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
