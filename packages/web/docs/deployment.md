# Luzzle Web Ecosystem Deployment Guide 🏗️

Deploying the Luzzle web ecosystem allows you to serve your digital garden as a
responsive, public website while providing a private, secure editor to manage
your archive in real time.

## System Architecture 🧩

The stack runs via Docker Compose and consists of four main containers:

1. **Web Explorer (`luzzle-web`)** — The SvelteKit frontend server that
  processes read queries from the SQLite database and renders pages.
2. **Web Worker (`luzzle-worker`)** — A sidecar processor that polls Sidequest
  and performs heavy background tasks like cloud synchronization and asset
  variant generation.
3. **LSP WebSocket Bridge (`luzzle-lsp`)** — Integrates CodeMirror inside the
  web editor with the Luzzle LSP server over WebSockets.
4. **Snappy Cache Proxy (`luzzle-proxy`)** — An Nginx container that acts as a
  reverse proxy, caching static assets and HTML pages to reduce load on the
SvelteKit application.

---

## Getting Started: Demo vs Production 🚀

The fastest way to test out the stack is to run the local demo:

```bash
# From the monorepo root, bring up the dev environment
docker-compose -f apps/web/docker-compose.dev.yml up
```

### Production Deployment

In a production environment, you don't need to rebuild the containers locally
unless you want to optimize specific web settings or bundle custom features.

- **Standard Way:** Run the official Luzzle production containers directly
(refer to [docker-compose.yml](../../../apps/web/docker-compose.yml)).
- **Optimization Way:** Build your own custom containers using the monorepo
  target build commands:

```bash
docker build -f apps/web/Dockerfile --target prod -t my-luzzle-web .
```

---

## Environment Variables 🔐

Configure a `.env` file in the same directory as your `docker-compose.yml` to
supply these credentials:

| Variable               | Description
|
| ---------------------- | -------------------------------------------------------------------- |
| `LUZZLE_AUTH_SECRET`   | A secure, random string used to encrypt cookie sessions for editing. |
| `LUZZLE_AUTH_USERNAME` | Username for accessing the web editor.                               |
| `LUZZLE_AUTH_PASSWORD` | Password for accessing the web editor.                               |
| `GOOGLE_API_KEY`       | (Optional) Your Gemini API key for AI metadata generation helper.    |

---

## Cloud Sync with Rclone ☁️

The Web Worker supports syncing your piece archive and static CDN assets to
cloud providers using `rclone`.

- **Sample Configuration:** Inspect the repository's sample
[rclone.conf](../../../apps/web/demo/rclone/rclone.conf) to see how local remotes are
configured.
- **Official Docs:** For configuring production cloud remotes (like AWS S3,
Cloudflare R2, Google Cloud Storage, or Backblaze B2), check out the [Official
Rclone Documentation](https://rclone.org/docs/).
