FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y \
		bash \
		curl \
		rclone

RUN apt-get update && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install -g @luzzle/web.tools@0.0.83

USER node

RUN mkdir -p /app/scripts /app/data /app/archive /app/assets

COPY ./server.js /app/server.js
COPY ./scripts/build.sh /app/scripts/pre.build.sh
COPY ./scripts/build.sh /app/scripts/build.sh
COPY ./scripts/build.sh /app/scripts/post.build.sh

RUN chown -R node:node /app

EXPOSE 9000

CMD ["node", "/app/server.js"]
