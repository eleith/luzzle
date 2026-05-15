FROM node:24-slim AS builder
WORKDIR /local

COPY package.json tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm install && npm run build

FROM node:24-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    unzip \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libnspr4 \
    libgbm1 \
    libasound2 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libexpat1 \
    libpango-1.0-0 \
    && curl -O https://downloads.rclone.org/rclone-current-linux-amd64.zip \
    && unzip rclone-current-linux-amd64.zip \
    && cp rclone-*-linux-amd64/rclone /usr/bin/ \
    && chown root:root /usr/bin/rclone \
    && chmod 755 /usr/bin/rclone \
    && rm -rf rclone-* \
    && rm -rf /var/lib/apt/lists/*

RUN npx @puppeteer/browsers install chrome-headless-shell@stable --path /opt/chrome && \
    ln -s $(find /opt/chrome/chrome-headless-shell -name chrome-headless-shell -type f | head -n 1) /usr/bin/chrome-headless-shell

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chrome-headless-shell

RUN mkdir -p /app/queue /app/archive /app/assets /app/rclone && \
    chgrp 0 /app /app/queue /app/archive /app/assets /app/rclone && \
    chmod g+w /app /app/queue /app/archive /app/assets /app/rclone

COPY --from=builder --chown=:0 --chmod=775 /local/dist /app/dist
COPY --from=builder --chown=:0 --chmod=775 /local/node_modules /app/node_modules
COPY --from=builder --chown=:0 --chmod=775 /local/package.json /app/package.json

EXPOSE 9000

CMD ["node", "/app/dist/src/index.js"]
