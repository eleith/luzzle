# Stage 1: Dependency builder
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Stage 2: Final runtime
FROM node:24-alpine
WORKDIR /app

# Install global tools
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install -g @luzzle/lsp@0.0.1 yaml-language-server \
    && npm cache clean --force

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Setup directories and permissions
RUN mkdir -p /app/archive && \
    chgrp 0 /app /app/archive && \
    chmod g+w /app /app/archive

# Copy application files
COPY --chown=:0 ./server.js ./luzzle-lsp.js ./markdownlint-lsp.js ./package.json ./
RUN chmod g+w /app/server.js /app/luzzle-lsp.js /app/markdownlint-lsp.js

EXPOSE 9001

CMD ["node", "/app/server.js"]
