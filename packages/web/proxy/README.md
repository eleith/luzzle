# @luzzle/web.proxy 🚀

A snappy, pre-configured Nginx reverse proxy caching layer for Luzzle Web
deployments.

## What it does 🧤

This package packages an Nginx reverse proxy tuned specifically for the Luzzle
Web Explorer. It caches static assets and HTML responses to ensure
lightning-fast load times and dramatically reduces pressure on the SvelteKit
Node application.

## SSL Termination & Reverse Proxy Headers 🔒

If you run another reverse proxy (like Cloudflare, Traefik, Caddy, or Nginx) in
front of this container for SSL termination, ensure that you configure it to
pass through standard proxy headers:

- **Forward `Accept-Encoding`:** Required so that Nginx gzip compression behaves
correctly.
- **Forward standard client headers:** E.g., `X-Forwarded-For`,
`X-Forwarded-Proto`, and `Host`.

---

## Deployment 🛠️

This service runs inside the `luzzle-proxy` container. For setup information,
refer to the [Web Stack Deployment Guide](../docs/deployment.md).
