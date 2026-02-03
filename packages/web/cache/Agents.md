# Agents.md for @luzzle/web.cache

Instructions for agents working on the `@luzzle/web.cache` package.

## Scope

This package provides a Dockerized Nginx caching layer specifically tuned for the
Luzzle Web Explorer. It acts as a reverse proxy to improve performance and reduce
load on the main application.

## Specifications

*   **Base Image:** Pinned version of `nginx:alpine` (e.g., `1.27.4-alpine`).
*   **Configuration:** Runtime configuration via environment variables using a
    custom entrypoint script and `envsubst`.
*   **No Mounting:** Users should not need to mount config files for standard
    use cases.

## Environment Variables

*   `LUZZLE_EXPLORER_HOST` (default: `luzzle-web`): Upstream hostname.
*   `LUZZLE_EXPLORER_PORT` (default: `3000`): Upstream port.

## Architecture

*   **Template:** `templates/nginx.conf.template` contains the full Nginx
    config with `${VAR}` placeholders.
*   **Entrypoint:** `docker-entrypoint.d/99-custom-config.sh` handles the
    substitution and overwrites `/etc/nginx/nginx.conf` at startup.
*   **Cache:** Configured to store up to 10GB of data, valid for 365 days, at
    `/var/cache/nginx/luzzle_cache`.

## Development

*   **Build:** `docker build .`
*   **Test:** Run the container and verify `nginx -T` output matches expectations.
