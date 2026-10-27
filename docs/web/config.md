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
[Republish affected pieces](templates.md#apply-your-choices) after OG changes.

## Sign-in

Omit `auth` for a public-only site with admin access disabled. For browser editing
and publishing, configure a session secret and exactly one provider.
Uncomment the example's credentials block, then add your own values to `.env`:

```dotenv
LUZZLE_AUTH_USERNAME=admin
LUZZLE_AUTH_PASSWORD=replace-with-a-strong-password
LUZZLE_AUTH_SECRET=replace-with-a-generated-secret
```

Replace both placeholders. Generate a secret with `openssl rand -hex 32`.

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
`Single Sign-On`; register `/auth/callback/oidc` on your public origin.
Use HTTPS beyond local testing. Changing the secret invalidates sessions.

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
