# Luzzle Web Builder

The heavy-lifting sidecar for the Luzzle Web Explorer. 🏗️

## Overview

`@luzzle/web.builder` is a specialized microservice designed to run alongside
the Luzzle Web Explorer. Its primary goal is to offload resource-intensive
tasks—such as database indexing, image resizing, and Open Graph
generation—ensuring the main web application remains lightweight and as fast as
a static site.

This service is typically deployed as a sidecar container in a Docker Compose
environment, sharing access to the archive and database volumes.

## Architecture

- **Sidecar Pattern:** Runs independently from the Web Explorer to isolate heavy
  dependencies (like Puppeteer/Chrome) and processing loads.
- **Single-Threaded:** Enforces a strict "one build at a time" policy to prevent
  race conditions when regenerating database tables or assets from the single
  source of truth (the archive).
- **Webhook Trigger:** Listens for HTTP POST requests to trigger the build
  pipeline.

## workflow

When a build is triggered, the service executes a pipeline using `@luzzle/web.tools`:

1. **Pre-Build Hook:** (`scripts/pre.build.sh`) Optional custom logic (e.g.,
   syncing from WebDAV).
2. **Sync:** Syncs the archive state to the database.
3. **SQLite Generation:** Drops and recreates optimized web tables
   (`web_pieces`).
4. **Asset Generation:** Resizes and optimizes images for web performance.
5. **Open Graph:** Generates social sharing images using Headless Chrome.
6. **Post-Build Hook:** (`scripts/post.build.sh`) Optional custom logic (e.g.,
   syncing assets to a CDN).

## Required Mounts

For the builder to function correctly, the following paths **must** be mounted
as volumes in the container:

- `/app/config.yaml`: The Luzzle configuration file.
- `/app/data/luzzle.sqlite`: The SQLite database file (shared with the Web Explorer).
- `/app/assets`: The directory where optimized assets and OG images are
generated (should be the Web Explorer's static assets folder).
- `/app/archive`: The source directory containing your Markdown pieces and raw
assets (as defined in your config).

## Usage

### Docker Compose

The builder is designed to share volumes with the main web application.

```yaml
services:
  builder:
    image: ghcr.io/eleith/luzzle-web-builder
    environment:
      - LUZZLE_BUILD_TOKEN=your-secret-token
    volumes:
      - ./config.yaml:/app/config.yaml
      - ./luzzle.sqlite:/app/data/luzzle.sqlite
      - ./static/assets:/app/assets
      - ./archive:/app/archive
```

### Environment Variables

- `LUZZLE_BUILD_TOKEN`: (Required) A secret token to authenticate webhook
requests, generate with `openssl rand -hex 32`

### API

```http
POST /hooks/build?token=your-secret-token
```

Returns a streaming text response with the build logs.

## Extensibility

You can mount custom scripts to `/app/scripts/pre.build.sh` or
`/app/scripts/post.build.sh` to extend functionality without modifying the
image.

- **Pre-build:** Useful for pulling changes from a remote source (Git, WebDAV)
  before the build starts.
- **Post-build:** Useful for notifying external services (Slack, Discord) or
  uploading generated assets to an S3 bucket/CDN.
