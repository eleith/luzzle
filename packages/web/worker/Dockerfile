FROM node:24-slim AS builder
WORKDIR /local

COPY package.json tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY assets ./assets

RUN npm run build:lock

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm install && npm run build

FROM node:24-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    unzip \
    ca-certificates \
    && curl -O https://downloads.rclone.org/rclone-current-linux-amd64.zip \
    && unzip rclone-current-linux-amd64.zip \
    && cp rclone-*-linux-amd64/rclone /usr/bin/ \
    && chown root:root /usr/bin/rclone \
    && chmod 755 /usr/bin/rclone \
    && rm -rf rclone-* \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app/queue /app/archive /app/assets /app/rclone && \
    chgrp 0 /app /app/queue /app/archive /app/assets /app/rclone && \
    chmod g+w /app /app/queue /app/archive /app/assets /app/rclone

COPY --from=builder --chown=:0 --chmod=775 /local/dist /app/dist
COPY --from=builder --chown=:0 --chmod=775 /local/node_modules /app/node_modules
COPY --from=builder --chown=:0 --chmod=775 /local/package.json /app/package.json
COPY --from=builder --chown=:0 --chmod=775 /local/assets /app/assets-bundled

RUN mkdir -p /app/dist/src/pieces/.compiled && \
    chgrp 0 /app/dist/src/pieces/.compiled && \
    chmod 777 /app/dist/src/pieces/.compiled

EXPOSE 9000

CMD ["node", "/app/dist/src/index.js"]
