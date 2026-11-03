# Configuration

Start with [config.example.yaml](config.example.yaml). Omitted settings use
defaults; unknown settings and invalid values fail validation. The
[editor schema](../../packages/web/templates/config.schema.json) lists fields and defaults.

## Files, URLs, and paths

Edit `config/config.yaml`. The container's `/app/config.yaml` alias makes relative
paths resolve from `/app`, not `/app/config`:

| Setting          | Default                | Purpose               |
| ---------------- | ---------------------- | --------------------- |
| `storage.root`   | `./archive`            | Markdown archive      |
| `paths.database` | `./data/luzzle.sqlite` | SQLite index          |
| `paths.assets`   | `./assets/pieces`      | Generated assets      |
| `paths.static`   | `./static`             | Legacy OG font lookup |
| `paths.cache`    | `./nginx`              | Shared proxy cache    |

Web and worker need matching mounts. Set `url.app` to your public URL; it defaults
to `${LUZZLE_APP_URL:-http://localhost:8080}`. Asset URLs default to same-origin;
`url.app_assets` and `url.luzzle_assets` accept CDN prefixes. Framework JS/CSS
stay same-origin. Use Compose service names for internal addresses.

Restart web and worker after config changes; no rebuild is needed.
[Republish](templates.md#apply-your-choices) after piece template or font changes.

## Sign-in

Omit `auth` to disable admin access. Otherwise configure a secret of at least
32 characters and exactly one provider. The example includes password sign-in;
generate its secret with `openssl rand -hex 32`.

For OIDC:

```yaml
auth:
  secret: "${LUZZLE_AUTH_SECRET}"
  oidc:
    issuer: "${OIDC_ISSUER}"
    clientId: "${OIDC_CLIENT_ID}"
    clientSecret: "${OIDC_CLIENT_SECRET}"
```

Register `/api/auth/callback/oidc` on your public origin. Use HTTPS in production.
Sessions last seven days; changing the secret invalidates them.

## Environment values

Compose loads `.env`. Reference variables explicitly in YAML:

- `${VAR}` requires a value.
- `${VAR:-fallback}` uses the fallback when unset, not when empty.
- `$$` escapes `$`; `$${VAR}` stays literal.

Expansion happens once in string values; catalog names must be literals.
Keep `.env` private. After editing it or changing mounts, run
`docker compose up -d --force-recreate`.

## Piece types

Each `pieces` entry maps an archive type's frontmatter into web fields.
`title` and `date_consumed` are required. `media` and `attachments` take selector
lists. `title: title` reads metadata, not literal text. See
[archives](../archive.md) and [templates](templates.md).

## Text and optional features

- Site identity: `content.text.title` and `.description`.
- Markdown sections: `pages.home.body` and `pages.feed.about`; create files first.
  Home defaults to latest on, random off; feed links default on.
- Theme tokens: `theme.light`, `.dark`, and `.globals`; quote hex colors.
  `theme.markdown.code.light` and `.dark` default to `github-light` and `github-dark`.
- AI: omit `ai` to disable, or set `provider: google` and `api_key`.
- Sync: see [remote sync](deployment.md#optional-remote-sync).
  Keep `assets.salt` stable to preserve published asset URLs.

## Site images

Set `content.images.favicon` or `.opengraph` to local filenames, such as
`./content/images/share.png`. Defaults `/images/favicon.png` and
`/images/opengraph.png` select bundled images, not filesystem paths.

Files must be nonempty, readable, regular files ≤5 MiB. Favicon accepts PNG/SVG/ICO;
OG accepts PNG/JPEG/WebP/GIF. Paths resolve from the supplied config filename.
Use the existing content mount; never overwrite `build/client` files.

Custom images use `/assets/favicon/{filename}` and `/assets/opengraph/{filename}`,
without the CDN prefix. Unavailable files return 404, not a bundled fallback.
Files are reread on use. Piece-specific OG images still take precedence.

## Local sans font

```yaml
content:
  fonts:
    sans: ./content/fonts/my-font.woff2
theme:
  globals:
    font-sans-name: '"My Font"'
    font-sans-weight: "300 900"
```

Use a licensed WOFF2 file ≤5 MiB; match its family and weights. Paths follow the
same rules as images. Browser and worker use this file; the browser URL is
`/assets/fonts/{filename}`, with revalidation. Files are reread on use.
Unavailable files return 404; the worker uses renderer fallback fonts.
This overrides `font-sans-url`; omit it to keep existing defaults.

`{filename}` is the URL-encoded basename, never directories. Browsers revalidate
same-name changes. Filename config changes need a restart; old URLs return 404.
Purge cached page HTML after config/filename changes.

## Error pages

Set `pages.error."404"`, `."4xx"`, or `."500"` independently. Each accepts a
config-relative Markdown `body` and `home` (default `true`) for the recovery link.
404 takes precedence over 4xx. Omitted or unreadable bodies use built-in copy;
HTTP status codes are preserved. Restart web after changes.
