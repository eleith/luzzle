# Luzzle Web Ecosystem Deployment Guide 🏗️

Serve your archive using the Docker Compose stack.

## Services

- **Web Explorer** — SvelteKit application and editor.
- **Worker** — OpenWorkflow jobs for synchronization and asset generation.
- **LSP bridge** — Editor language support over WebSockets.
- **Proxy** — Nginx routing and caching.

## Local demo

From the repository root:

```sh
docker-compose -f apps/web/docker-compose.dev.yml up
```

## Production

Use the published images with [docker-compose.yml](../../../apps/web/docker-compose.yml).
To build a custom Explorer image:

```sh
docker build -f apps/web/Dockerfile --target prod -t my-luzzle-web .
```

## Configuration

Configure the site in `config.yaml` and supply any referenced environment
variables through `.env` beside the Compose file. The supplied Compose setup
passes that environment to both the Explorer and Worker.

See the [configuration reference](./config.md) for authentication, AI and
other settings, and the [demo config](../../../apps/web/demo/config.yaml) for
an example.

## Cloud sync

Configure rclone remotes in `rclone.conf`, then select them through
`sync.archive` and `sync.cdn` in `config.yaml`.

See the [sample rclone configuration](../../../apps/web/demo/rclone/rclone.conf)
and [rclone documentation](https://rclone.org/docs/).
