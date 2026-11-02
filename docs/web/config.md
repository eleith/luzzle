# Configuration

Start with [config.example.yaml](config.example.yaml). Omitted settings use
defaults; an empty YAML file does too. Invalid values and unknown settings fail
validation. Keep only what you need. YAML is quite enough paperwork already.

The example links an editor schema for available settings, template fields and
defaults. If you pin an image version, use that release's
[generated schema](../../packages/web/templates/config.schema.json).

## Files, URLs, and paths

Edit `config/config.yaml` beside Compose. Web and worker mount its directory
read-only; `/app/config.yaml` is an alias to `/app/config/config.yaml`.
Keep that alias intact. The supplied layout roots relative paths at `/app`,
not the physical YAML directory:

- `storage.root: ./archive` — Markdown archive.
- `paths.database: ./data/luzzle.sqlite` — SQLite index.
- `paths.assets: ./assets/pieces` — generated piece assets.
- `paths.static: ./static` — local render assets, including configured OG fonts.
- `paths.cache: ./nginx` — worker access to the shared proxy cache.

OG fonts are local files, such as `static/fonts/noto-sans.woff2`. Missing font
files use the renderer's fallback fonts.

Web and worker must see the same archive, database and piece assets. Keep the
sample paths unless you also adjust the mounts; use absolute paths for custom layouts.

`url.app` is your public URL, defaulting to
`${LUZZLE_APP_URL:-http://localhost:8080}`. `url.app_assets` and
`url.luzzle_assets` default to empty for same-origin assets; set them for a CDN.
Framework JavaScript and CSS stay same-origin. Keep the sample's production
internal service names, not the checkout's `luzzle-dev-*` addresses.

Restart web and worker after runtime config edits, then refresh. No hot reload.
[Republish affected pieces](templates.md#apply-your-choices) after piece OG template
or font changes, not site-image changes.

## Sign-in

Omit `auth` for a public-only site with admin access disabled. For browser editing
and publishing, configure a session secret and exactly one provider.
Uncomment the example's credentials block, then add your own values to `.env`:

```dotenv
LUZZLE_AUTH_USERNAME=admin
LUZZLE_AUTH_PASSWORD=replace-with-a-strong-password
LUZZLE_AUTH_SECRET=replace-with-a-generated-secret
```

Replace both placeholders. The resolved secret must contain at least 32 characters.
Generate one with `openssl rand -hex 32`.

For OIDC, use this instead:

```yaml
auth:
  secret: "${LUZZLE_AUTH_SECRET}"
  oidc:
    issuer: "${OIDC_ISSUER}"
    clientId: "${OIDC_CLIENT_ID}"
    clientSecret: "${OIDC_CLIENT_SECRET}"
```

All shown values must be nonempty. Optional OIDC `name` defaults to
`Single Sign-On`; register `/api/auth/callback/oidc` on your public origin.
Use HTTPS beyond local testing. Sessions last seven days without rolling renewal.
Changing the secret invalidates sessions; the Auth.js migration also requires a new sign-in.
`url.app` supplies the public origin for authentication and the web server.

## Environment values

Compose passes `.env` to web and worker. Reference variables explicitly in YAML;
only the built-in URL and asset-salt defaults already contain references.

- `${VAR}` requires a value; unset is an error.
- `${VAR:-fallback}` uses the fallback only when unset. Empty counts as set.
- `$$` becomes `$`; `$${VAR}` stays literal `${VAR}`.

Expansion happens once in string values. Catalog names must be supported literals.
Keep `.env` private and out of Git. After editing it, run
`docker compose up -d --force-recreate`; restart alone keeps the old environment.

## Piece types

Each `pieces` entry names an archive type and maps frontmatter selectors into
web fields. `title` and `date_consumed` are required; `summary`, `tags`, `media`,
and `attachments` are optional. `title: title` reads metadata, not literal text.
`media` and `attachments` are lists of selectors, such as `[cover]`.
Keep schemas in the [archive](../archive.md); choose [templates](templates.md)
independently. A `books` type can use a `book` page. See also the [CLI](../cli.md).

## Text and optional features

Set `content.text.title` and `.description` for your site's identity.
`pages.home.body` and `pages.feed.about` accept ordinary Markdown files; create
them before enabling the sample paths. Home defaults to latest on, random off;
feed links default on. Omitting feed `about` hides its explanation card.

Override selected tokens under `theme.light`, `theme.dark`, and `theme.globals`.
Quote hex colors. `theme.markdown.code.light` and `.dark` select code/editor themes,
defaulting to `github-light` and `github-dark`.
Omit `ai` to disable generation; otherwise supply `provider: google` and
`api_key: '${GOOGLE_API_KEY}'`. [Remote sync](deployment.md#optional-remote-sync)
is optional. `assets.salt` defaults to `${LUZZLE_ASSET_SALT:-}`; keep it stable
because changing it changes published asset keys and URLs.

## Site images

`content.images.favicon` defaults to `/images/favicon.png`, and
`content.images.opengraph` defaults to `/images/opengraph.png`. These values select
the bundled static images, including the `url.app_assets` prefix.

To override an image, set its value to a nonempty local filename, not a remote URL
or browser path. Relative filenames resolve against
the supplied config filename; absolute filenames are also allowed. With the
supplied `/app/config.yaml` alias, `./content/images/share.png` resolves to
`/app/content/images/share.png`, not `/app/config/content/images/share.png`.
Reuse the existing read-only `content` mount; no new directory mounts are needed.

Each image must be a readable regular file, at most 5 MiB. Supported formats:

- Favicon: PNG, SVG, ICO.
- Site Open Graph image: PNG, JPEG, WebP, GIF.

Custom files use public, same-origin `/site-assets/favicon` and
`/site-assets/opengraph` endpoints,
respectively, without `url.app_assets`. These serve only the selected files,
without generation or embedding. Unsupported filename types fail configuration
validation. Missing, empty, unreadable, or oversized files return 404, with no
bundled fallback. These endpoints also return 404 when the bundled image is selected.

Restart web after changing image settings or files; neither is live-reloaded.
Piece OG images and their generation are unaffected; piece-specific OG images
still take precedence. Piece pages, including previews, use the site favicon.
Custom images do not require an application build.

## Error pages

Customize three independent presentations under `pages.error`: `"404"` is selected
before `"4xx"` (all remaining client errors); it does not inherit `"4xx"` copy.
`"500"` presents every server error without changing its actual HTTP status.
Each slot defaults to `{}`: optional
`body` is a nonempty, config-relative Markdown filename, and `home` defaults to
`true` to show the recovery link. Omit `body` for built-in copy; set `home: false`
to hide that link without removing global navigation. The [example](config.example.yaml) shows all three.

Only the selected Markdown file is loaded, lazily. If it cannot be loaded or
rendered, built-in copy is used instead. Restart web after changing these settings
or files. Bodies are ordinary Markdown, not templates; environment references in
configured filenames still use the shared config expansion described above.
