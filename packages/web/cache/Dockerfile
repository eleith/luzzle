FROM nginx:1.27.4-alpine

# Install envsubst (it is usually included in nginx:alpine, but let's be safe if we need other tools, though standard alpine usually has it via gettext, nginx image has it pre-installed)

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our template to a staging area (not the default templates dir, to avoid default processing)
COPY templates/nginx.conf.template /etc/nginx/nginx.conf.template

# Copy our custom entrypoint script
COPY docker-entrypoint.d/99-custom-config.sh /docker-entrypoint.d/99-custom-config.sh
RUN chmod +x /docker-entrypoint.d/99-custom-config.sh

# Environment variables with defaults
ENV LUZZLE_EXPLORER_HOST=luzzle-web
ENV LUZZLE_EXPLORER_PORT=3000

# Permissions for running as non-root
RUN touch /etc/nginx/nginx.conf && \
    chmod 666 /etc/nginx/nginx.conf && \
    mkdir -p /app/static/pieces/assets && \
    mkdir -p /app/cache && \
    chmod -R 777 /app/cache
