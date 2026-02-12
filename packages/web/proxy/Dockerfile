FROM nginxinc/nginx-unprivileged:1.27.4-alpine

RUN rm -f /etc/nginx/conf.d/default.conf

COPY templates/default.conf.template /etc/nginx/templates/default.conf.template

ENV LUZZLE_EXPLORER_HOST=luzzle-web
ENV LUZZLE_EXPLORER_PORT=3000
ENV LUZZLE_PROXY_CACHE=luzzle
ENV LUZZLE_PROXY_ACCESS_LOG=/dev/stdout
ENV LUZZLE_PROXY_ERROR_LOG=/dev/stderr

USER root
RUN chmod 777 /etc/nginx/conf.d

USER 101
