FROM node:24-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    rclone \
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
    && rm -rf /var/lib/apt/lists/*

RUN npx @puppeteer/browsers install chrome-headless-shell@stable --path /opt/chrome && \
    ln -s $(find /opt/chrome/chrome-headless-shell -name chrome-headless-shell -type f | head -n 1) /usr/bin/chrome-headless-shell

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chrome-headless-shell

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install -g @luzzle/web.tools@0.0.126 \
    && npm cache clean --force

RUN mkdir -p /app/scripts /app/data /app/archive /app/assets && \
    chgrp 0 /app /app/scripts /app/data /app/archive /app/assets && \
    chmod g+w /app /app/scripts /app/data /app/archive /app/assets

COPY --chown=:0 --chmod=775 ./server.js /app/server.js
COPY --chown=:0 --chmod=775 ./scripts/*.sh /app/scripts/

EXPOSE 9000

CMD ["node", "/app/server.js"]
