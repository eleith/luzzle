FROM node:20.19.5-slim AS builder
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

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
RUN npm run build
RUN npm prune --omit=dev

FROM node:20.19.5-slim

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/config ./config

EXPOSE 3000
ENV PORT=3000

CMD ["node", "build"]
