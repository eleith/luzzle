# This Dockerfile provides an example of how to build an optimized, 
# multi-stage production container for your custom Luzzle setup.
# By compiling your custom content and configuration statically, 
# you benefit from instant startup times and a much smaller final image.

# --- STAGE 1: Builder ---
# Uses the full Luzzle Explorer image which contains all build dependencies
# (Node.js, Vite, Svelte compiler, etc.)
FROM luzzle-web AS builder
WORKDIR /app

# Copy in your custom configuration and content components
COPY config.yaml ./config.yaml
COPY content/ ./content/

# Run the SvelteKit compilation. This will read your config.yaml and 
# statically inject it, while compiling all your Svelte content components.
RUN npm run build

# --- STAGE 2: Production Runtime ---
# We switch to a completely bare-bones Alpine Linux Node image
FROM node:24-alpine
WORKDIR /app

# Copy ONLY the final compiled outputs and production dependencies from Stage 1
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY config.yaml ./config.yaml

# Expose the standard SvelteKit port
EXPOSE 3000

# Start the optimized Node server directly, bypassing manager.js
CMD ["node", "build/index.js"]
