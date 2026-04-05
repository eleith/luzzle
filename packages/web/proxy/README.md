# @luzzle/web.proxy 🚀

A snappy caching layer for Luzzle Web deployments.

## What it does 🧤

This is a pre-configured Nginx reverse proxy tuned specifically for the Luzzle Web Explorer. It caches static assets and HTML responses to ensure lightning-fast load times and reduced pressure on the SvelteKit application. 

For deployment instructions, see the Web Explorer documentation.

## SSL Termination

If placing a reverse proxy in front of this container for SSL, ensure it forwards the `Accept-Encoding` header from the client. Without it, gzip compression will not work.