FROM node:24-slim

RUN apt-get update && apt-get install -y --no-install-recommends rsync && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY --chown=:0 package.json ./package.json
COPY --chown=:0 src ./src
COPY --chown=:0 static ./static
COPY --chown=:0 scripts ./scripts
COPY --chown=:0 tsconfig.json ./tsconfig.json
COPY --chown=:0 svelte.config.js ./svelte.config.js
COPY --chown=:0 vite.config.ts ./vite.config.ts
COPY --chown=:0 eslint.config.js ./eslint.config.js

RUN npm run build:lock
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install --include dev \
    && npm cache clean --force

RUN mkdir -p /app/assets/pieces /app/assets/build /app/data /app/content /app/build /app/node_modules/.cache /app/node_modules/.vite /app/.svelte-kit && \
    touch /app/config.yaml /app/.env && \
    chmod 777 /app && \
    chmod -R 777 /app/src /app/scripts /app/static /app/assets /app/data /app/content /app/build /app/node_modules/.cache /app/node_modules/.vite /app/.svelte-kit /app/config.yaml /app/.env /app/package.json /app/package-lock.json

EXPOSE 3000

ENTRYPOINT ["node", "scripts/manager.js"]
