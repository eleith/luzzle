FROM node:24-alpine

RUN apk add --no-cache rsync

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY --chown=:0 --chmod=777 package.json tsconfig.json svelte.config.js vite.config.ts eslint.config.js ./
COPY --chown=:0 --chmod=777 src ./src
COPY --chown=:0 --chmod=777 static ./static
COPY --chown=:0 --chmod=777 scripts ./scripts

RUN npm run build:lock

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm install --include dev && \
    npm uninstall \
      eslint \
      eslint-config-prettier \
      eslint-plugin-svelte \
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
    chmod 777 /app /app/config.yaml /app/.env /app/package.json /app/package-lock.json && \
    chmod -R 777 /app/assets /app/data /app/content /app/build /app/node_modules/.cache /app/node_modules/.vite /app/.svelte-kit

EXPOSE 3000

ENTRYPOINT ["node", "scripts/manager.js"]
