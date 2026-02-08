FROM nginxinc/nginx-unprivileged:1.27.4-alpine

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy our template to a staging area
COPY templates/nginx.conf.template /etc/nginx/nginx.conf.template

# Copy our custom entrypoint script
COPY docker-entrypoint.d/99-custom-config.sh /docker-entrypoint.d/99-custom-config.sh

USER root
RUN chmod +x /docker-entrypoint.d/99-custom-config.sh

# Environment variables with defaults
ENV LUZZLE_EXPLORER_HOST=luzzle-web
ENV LUZZLE_EXPLORER_PORT=3000

# Permissions for the config file
RUN touch /etc/nginx/nginx.conf && \
    chmod 666 /etc/nginx/nginx.conf

USER 101
