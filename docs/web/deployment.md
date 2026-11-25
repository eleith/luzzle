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
Republish pieces after font or Open Graph template changes to regenerate OG images.
Changes to `.env` or mounts require
`docker compose up -d --force-recreate`.

To update: back up your data, [convert any list of piece types to a mapping](config.md#piece-types),
[migrate any non-default template names](templates.md#migrate-a-named-design), update `LUZZLE_VERSION` if pinned, then pull and
start again. **When upgrading from generated template routes**, wait until the new web
service is healthy, then [clear cached public pages](#clear-cached-public-pages) and
invalidate the corresponding HTML and SvelteKit data responses at any CDN. Do this
once even if you already used `default` and did not change your YAML: the page URLs
are unchanged, but the route data served at those URLs has changed.

## Published file URLs

Published images and attachments are served at `/assets/pieces/<path>`. When upgrading
from `/pieces/assets/<path>`, update web, worker, and proxy together and [clear cached
public pages](#clear-cached-public-pages). There is no redirect: `assets` is now a valid
piece type under `/pieces/`. If you serve files from a separate CDN, expose the same
relative files under the new URL prefix there too.

Files, database asset paths, and private preview URLs do not move. Existing Open Graph
PNGs work without regeneration. If your Markdown does not link to piece assets, no pieces
need republishing. For each piece whose published Markdown HTML contains old asset URLs,
use **More → Publish** in the source editor to regenerate it. Relative references in the
source can stay as written; replace literal old URLs before publishing. Update external
links separately.

## Clear cached public pages

Restarting web or the proxy does not remove cached responses. The production
proxy keys them by the full request URI: `/pieces`, `/pieces/books`, `?page=2`, `?year=2024`,
and combinations are separate entries. When changing a listing icon, invalidate
the homepage (`/`), listings and affected `/search` queries, including their SvelteKit data requests.
When changing a page design, invalidate the affected `/pieces/<type>/<slug>` pages and their data requests. If you operate
an additional cache or CDN, invalidate those variants there too.

The shipped Nginx proxy has no per-URL purge endpoint. The worker’s publish
cache-purge step clears the shared cache directory. To clear it **without
publishing**, use the following from the [example Compose](docker-compose.yml)
deployment directory after web is healthy with the new config:

```sh
docker compose stop luzzle-proxy
find ./nginx/cache -mindepth 1 -delete
docker compose start luzzle-proxy
```

This briefly stops public traffic and evicts **all** proxy cache entries. Verify
`./nginx/cache` is the dedicated bind mount for the proxy’s `/tmp/cache` before
running `find`; keep the mount directory itself. Reload the listing through the
proxy and check both the base URL and a previously cached filtered page.

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
