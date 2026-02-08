# Agents.md for @luzzle/web.proxy

Instructions for agents working on the `@luzzle/web.proxy` package.

## Scope

This package provides a Dockerized Nginx caching layer specifically tuned for the
Luzzle Web Explorer. It acts as a reverse proxy to improve performance and reduce
load on the main application.

## Specifications

*   **Base Image:** `nginxinc/nginx-unprivileged:alpine` (supports rootless).
*   **Configuration:** Runtime configuration via environment variables using the
    official Nginx template pattern.
*   **No Mounting:** Users should not need to mount config files for standard
    use cases.

## Environment Variables

*   `LUZZLE_EXPLORER_HOST` (default: `luzzle-web`): Upstream hostname.
*   `LUZZLE_EXPLORER_PORT` (default: `3000`): Upstream port.

## Architecture

*   **Template:** `templates/default.conf.template` contains the Nginx server
    and cache config with `${VAR}` placeholders.
*   **Loading:** Templates are automatically processed by the base image from
    `/etc/nginx/templates/` into `/etc/nginx/conf.d/`.
*   **Cache:** Configured to store up to 10GB of data, valid for 365 days, at
    `/tmp/cache`.

## Development

*   **Build:** `docker build .`
*   **Test:** Run the container and verify `nginx -T` output matches expectations.