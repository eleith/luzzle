# Deployment

Use the [Compose example](docker-compose.yml): four published images for web,
worker, editor language server, and proxy. No checkout or custom Dockerfile needed.

## Set up

With Docker and Compose installed, make a deployment directory:

```sh
mkdir luzzle
cd luzzle
mkdir -p config archive assets/pieces data content rclone static nginx/cache
touch .env
```

Save [docker-compose.yml](docker-compose.yml) here and
[config.example.yaml](config.example.yaml) as `config/config.yaml`.
Neither needs files from the monorepo.

Compose requires `.env`, even if empty. Optionally set `LUZZLE_VERSION` there to
pin all four images to a published release; otherwise they use `latest`.
Services use UID/GID `1000:1000` unless `UID` and `GID` override them. Match host
directory permissions to those IDs: archive, assets, data, rclone state, and
cache must be writable. Bind mounts do not inherit the image's permissions.
Keep `.env` private and out of Git.

Set `url.app` to your public URL. Prepare an [archive](../archive.md), configure
its [piece types](config.md#piece-types), and enable [sign-in](config.md#sign-in)
to edit and publish through `/admin`. Without auth, admin access is disabled.

## Start and publish

```sh
docker compose pull
docker compose up -d
```

Open <http://localhost:8080>, or your configured public URL. Only proxy port
**8080** is exposed. Internal addresses are `luzzle-web:3000`,
`luzzle-worker:9000`, and `luzzle-lsp:9001`, not `localhost` or `luzzle-dev-*`.
The web image starts an already-built server; config changes need no rebuild.

Sign in and visit `/admin/publish` to check changes and publish initial content.
The [CLI](../cli.md) can prepare an archive, but indexing alone does not generate
web assets. Saving edits is not publishing them either.

## Check and restart

```sh
docker compose ps
docker compose logs --tail=100 luzzle-web luzzle-worker luzzle-proxy
```

Check `/api/health` through the proxy, `/admin/health` when signed in, and the
publish report. A healthy process does not promise a successful publish.

Edit the real `config/config.yaml`, not the container's `config.yaml` symlink.
Runtime config is cached; restart web and worker after edits:

```sh
docker compose restart luzzle-web luzzle-worker
```

After changing `.env` or mounts, use `docker compose up -d --force-recreate`.
To update, back up your archive and deployment data, change `LUZZLE_VERSION` if
pinned, then run `docker compose pull` and `docker compose up -d`.
[Republish affected pieces](templates.md#apply-your-choices) after OG changes.

## Optional remote sync

Put your rclone configuration in `rclone/rclone.conf`. Set `sync.archive` for
bidirectional archive sync and `sync.cdn` for generated assets, using a remote
name and path from that file. Empty remote or path skips that sync.
CDN `strategy: sync` deletes destination-only files; `copy` does not.
Read the [rclone docs](https://rclone.org/docs/) before syncing anything precious.
