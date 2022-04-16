# Install dependencies only when needed
FROM node:16-alpine AS builder

WORKDIR /app

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry.
ENV NEXT_TELEMETRY_DISABLED 1

COPY public ./public
COPY generated ./generated
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
COPY package.json ./
COPY package-lock.json ./
COPY .eslintrc.json ./
COPY .prettierrc.json ./
COPY .env ./
COPY .env.local ./
COPY .env.production ./
COPY next.config.js ./
COPY next-env.d.ts ./
COPY graphql.config.yml ./
RUN npm ci
RUN npm run build

# Production image, copy all the files and run next
FROM node:16-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --gid 1001 --system nodejs
RUN adduser --system nextjs --uid 1001

# You only need to copy next.config.js if you are NOT using the default configuration
# COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env ./
COPY --from=builder /app/.env.production ./
COPY --from=builder /app/.env.local ./
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
#COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

RUN npm ci --only=production

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
