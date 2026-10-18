# Build context: monorepo root. This proves the package boundary, not the final web image.
FROM node:26-alpine AS builder
WORKDIR /m
RUN npm install -g pnpm@11.2.2

# Keep unrelated source, archive content, and local configuration out of this proof.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cli/package.json apps/cli/
COPY apps/core/package.json apps/core/
COPY apps/lsp/package.json apps/lsp/
COPY apps/web/package.json apps/web/
COPY packages/web/config/package.json packages/web/config/
COPY packages/web/db/package.json packages/web/db/
COPY packages/web/jobs/package.json packages/web/jobs/
COPY packages/web/lsp/package.json packages/web/lsp/
COPY packages/web/pieces/package.json packages/web/pieces/
COPY packages/web/proxy/package.json packages/web/proxy/
COPY packages/web/theme/package.json packages/web/theme/
COPY packages/web/worker/package.json packages/web/worker/
COPY packages/web/templates/ packages/web/templates/

RUN pnpm --filter @luzzle/web.templates... install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @luzzle/web.templates build
RUN node packages/web/templates/test/prepare-container.js /proof
RUN pnpm --filter @luzzle/web.templates deploy --prod --legacy /pruned

# No workspace, compiler, bundler, or build-stage node_modules crosses this boundary.
FROM node:26-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /proof/ ./
COPY --from=builder /pruned/ ./node_modules/@luzzle/web.templates/
USER node
CMD ["node", "check.mjs"]
