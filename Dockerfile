FROM node:20.18.0-alpine AS builder
WORKDIR /app

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY packages/web ./packages/web
COPY packages/core ./packages/core

RUN apk add --no-cache libc6-compat
#RUN --mount=type=secret,id=npmrc cp /run/secrets/npmrc /root/.npmrc

RUN npm ci -w @luzzle/web -w @luzzle/core
#RUN npm run build -w @luzzle/core
RUN npm run build -w @luzzle/web
RUN npm prune --production

FROM node:20.18.0-alpine
WORKDIR /app

COPY --from=builder /app/node_modules /app/node_modules/
COPY --from=builder /app/packages/web/build /app/packages/web/build/
COPY --from=builder /app/packages/web/node_modules /app/packages/web/node_modules/
COPY --from=builder /app/packages/web/package.json /app/packages/web/package.json
COPY --from=builder /app/packages/web/.env.local /app/packages/web/.env.local
COPY --from=builder /app/packages/web/data /app/packages/web/data/

EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV production

WORKDIR /app/packages/web
CMD [ "node", "--env-file=.env.local", "build" ]
