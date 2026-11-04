# Deployment

The [Compose example](docker-compose.yml) runs published web, worker, LSP and proxy
images. No checkout or custom build is needed.

## Set up

```sh
mkdir luzzle && cd luzzle
mkdir -p config archive assets/pieces assets/previews data content rclone static nginx/cache
touch .env
```

Save [docker-compose.yml](docker-compose.yml) here and
[config.example.yaml](config.example.yaml) as `config/config.yaml`.

- Set `url.app` to your public URL and configure [piece types](config.md#piece-types).
- Enable [sign-in](config.md#sign-in) for admin access.
- Keep `.env` private; optionally pin `LUZZLE_VERSION` instead of `latest`.
- Services default to UID/GID `1000:1000`; override with `UID`/`GID`.
  Archive, assets, data, rclone state and cache must be writable by those IDs.
- Put custom [images](config.md#site-images) and [fonts](config.md#local-sans-font)
  under `content/`; do not overwrite `build/client` files.

## Start and publish

```sh
docker compose pull
docker compose up -d
```

Open <http://localhost:8080> or your public URL. Only proxy port 8080 is exposed.
Sign in at `/admin`, then publish through `/admin/publish`. Saving or CLI indexing
alone does not publish web assets.

## Check and restart

```sh
docker compose ps
docker compose logs --tail=100 luzzle-web luzzle-worker luzzle-proxy
```

Check `/api/health`, `/admin/health` and the publish report.
After config changes:

```sh
docker compose restart luzzle-web luzzle-worker
```

Image and font files are reread on use; replacing them needs no restart.
Republish pieces after font or piece-template changes to regenerate OG images.
Changes to `.env` or mounts require
`docker compose up -d --force-recreate`.

To update: back up your data, update `LUZZLE_VERSION` if pinned, then pull and
start again.

## Preview storage and cleanup

The worker writes previews to `assets/previews`; the web service needs the same
directory mounted read-only. For existing deployments, first create this directory
with ownership and write permissions matching the worker's configured UID/GID.
Then add the preview mount from the Compose example and recreate `luzzle-web`;
updating the image alone does not change mounts.

The worker removes expired previews and app logs daily around 02:00 UTC.
Finished jobs are retained for seven days; workflow history stays.

## Optional remote sync

Put credentials in `rclone/rclone.conf`. Configure `sync.archive` for bidirectional
archive sync and `sync.cdn` for generated assets. Empty remote/path disables sync.
CDN `strategy: sync` deletes destination-only files; `copy` does not.
Read the [rclone docs](https://rclone.org/docs/) first.
