# evolved from: https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

# Install dependencies only when needed
FROM node:18-alpine AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json ./
COPY package-lock.json ./
COPY packages ./packages

RUN npm ci -w @luzzle/web -w @luzzle/ui

# Rebuild the source code only when needed
FROM node:18-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY tsconfig.json ./
COPY packages ./packages

# disable nextjs telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build -w @luzzle/web

# Production image, copy all the files and run next
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
# disable nextjs telemetry in production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --gid 1001 --system nodejs
RUN adduser --system nextjs --uid 1001

COPY --from=builder /app/packages/web/public ./packages/web/public
COPY --from=builder /app/packages/web/data ./packages/web/data
COPY --from=builder /app/packages/web/.env ./packages/web/.env
COPY --from=builder /app/packages/web/.env.local ./packages/web/.env.local
COPY --from=builder /app/packages/web/.env.production ./packages/web/.env.production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/ui ./packages/ui

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/standalone ./packages/web
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/static ./packages/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "/app/packages/web/server.js"]
