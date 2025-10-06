FROM node:20.18.0-alpine
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY src ./src
COPY static ./static
COPY tsconfig.json ./tsconfig.json
COPY svelte.config.js ./svelte.config.js
COPY vite.config.ts ./vite.config.ts

COPY .env.sample ./.env.local

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
