# Stage 1: Dependency builder
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Stage 2: Final runtime
FROM node:24-alpine
WORKDIR /app

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install -g @luzzle/lsp@0.0.1 yaml-language-server \
    && npm cache clean --force

COPY --from=builder /app/node_modules ./node_modules

RUN mkdir -p /app/archive && \
    chgrp 0 /app /app/archive && \
    chmod g+w /app /app/archive

COPY --chown=:0 --chmod=775 ./server.js ./luzzle-lsp.js ./markdownlint-lsp.js ./package.json ./

EXPOSE 9001

CMD ["node", "/app/server.js"]
