FROM node:24-alpine

# Alpine uses apk instead of apt. rsync is needed for the manager script.
RUN apk add --no-cache rsync

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY --chown=:0 package.json tsconfig.json svelte.config.js vite.config.ts eslint.config.js ./
COPY --chown=:0 src ./src
COPY --chown=:0 static ./static
COPY --chown=:0 scripts ./scripts

RUN npm run build:lock

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm install --include dev && \
    npm uninstall \
      eslint \
      eslint-config-prettier \
      eslint-plugin-svelte \
      prettier \
      prettier-plugin-svelte \
      svelte-check \
      typescript-eslint \
      @types/eslint \
      @types/mdast \
      @types/mime-types \
      @types/node \
      @types/unist && \
    npm cache clean --force

RUN mkdir -p /app/assets/pieces /app/assets/build /app/data /app/content /app/build /app/node_modules/.cache /app/node_modules/.vite /app/.svelte-kit && \
    touch /app/config.yaml /app/.env && \
    chmod 777 /app && \
    chmod -R 777 /app/src /app/scripts /app/static /app/assets /app/data /app/content /app/build /app/node_modules/.cache /app/node_modules/.vite /app/.svelte-kit /app/config.yaml /app/.env /app/package.json /app/package-lock.json

EXPOSE 3000

ENTRYPOINT ["node", "scripts/manager.js"]
