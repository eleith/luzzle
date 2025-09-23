FROM node:20.19.5-slim
WORKDIR /app

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY src ./src
COPY static ./static
COPY sample ./sample
COPY config ./config
COPY tsconfig.json ./tsconfig.json
COPY svelte.config.js ./svelte.config.js
COPY vite.config.ts ./vite.config.ts
COPY scripts/build.sh ./scripts/build.sh

RUN chmod +x ./scripts/build.sh

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
