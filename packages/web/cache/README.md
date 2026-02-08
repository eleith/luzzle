# @luzzle/web.cache

A dedicated Nginx caching layer for the Luzzle Web Explorer.

This package builds a Docker image that serves as a caching reverse proxy. It is designed to sit in front of the `@luzzle/web` (Explorer) application, caching static assets, pieces, and HTML responses to reduce load on the Node.js application.

## Configuration

The image is configured via environment variables. You do not need to mount a config file unless you have custom requirements.

| Variable | Default | Description |
|----------|---------|-------------|
| `LUZZLE_EXPLORER_HOST` | `luzzle-web` | The hostname of the Luzzle Web Explorer service. |
| `LUZZLE_EXPLORER_PORT` | `3000` | The port the Luzzle Web Explorer is listening on. |

## Usage (Docker Compose)

```yaml
services:
  luzzle-web:
    image: ghcr.io/eleith/luzzle-web:latest
    restart: always
    volumes:
      - ./data/assets:/app/assets/pieces # Explorer needs the assets

  luzzle-cache:
    image: ghcr.io/eleith/luzzle-web-cache:latest
    restart: always
    environment:
      - LUZZLE_EXPLORER_HOST=luzzle-web
      - LUZZLE_EXPLORER_PORT=3000
    ports:
      - "8080:8080" # Expose the cache to the outside world
    volumes:
      # - luzzle-cache-data:/app/cache # Optional: Persist Nginx cache
    depends_on:
      - luzzle-web
```

## Cache Details

```bash
docker build -t luzzle-web-cache .
```
