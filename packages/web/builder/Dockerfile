FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y \
		bash \
		curl \
		rclone

# install dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install -g @luzzle/web.tools@0.0.82

RUN mkdir -p /app/scripts /app/data /app/archive /app/assets

COPY ./server.js /app/server.js
COPY ./scripts/build.sh /app/scripts/pre.build.sh
COPY ./scripts/build.sh /app/scripts/build.sh
COPY ./scripts/build.sh /app/scripts/post.build.sh

RUN chown -R node:node /app

USER node

EXPOSE 9000

CMD ["node", "/app/server.js"]
