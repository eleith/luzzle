# Agents.md for @luzzle/web.proxy 🚀

## Scope
Nginx-based caching layer for production deployments.

## Architecture
* **Base**: `nginxinc/nginx-unprivileged:alpine`.
* **Config**: Uses Nginx templates (`templates/`) for runtime environment variable substitution.
* **Logic**: Keep the Nginx config thin and focused on caching headers and upstream proxying.
