FROM node:24-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
		bash \
		curl \
		rclone \
    wget \
    gnupg \
    ca-certificates \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install -g @luzzle/web.tools@0.0.125 \
    && npm cache clean --force

RUN mkdir -p /app/scripts /app/data /app/archive /app/assets && \
    chgrp 0 /app /app/scripts /app/data /app/archive /app/assets && \
    chmod g+w /app /app/scripts /app/data /app/archive /app/assets

COPY --chown=:0 ./server.js /app/server.js
COPY --chown=:0 ./scripts/pre.build.sh /app/scripts/pre.build.sh
COPY --chown=:0 ./scripts/build.sh /app/scripts/build.sh
COPY --chown=:0 ./scripts/post.build.sh /app/scripts/post.build.sh
COPY --chown=:0 ./scripts/pre.deploy.sh /app/scripts/pre.deploy.sh
COPY --chown=:0 ./scripts/deploy.sh /app/scripts/deploy.sh
COPY --chown=:0 ./scripts/post.deploy.sh /app/scripts/post.deploy.sh

RUN chmod g+w /app/server.js /app/scripts/*.sh

EXPOSE 9000

CMD ["node", "/app/server.js"]
