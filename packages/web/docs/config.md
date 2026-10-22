# Web Configuration Reference ⚙️

The Web Explorer and Worker share `config.yaml`. Omitted settings use defaults.
An explicitly supplied config filename must exist and be readable; missing files
are errors. Programmatic callers can use `loadConfig()` without a filename to
request defaults. An existing empty or comment-only YAML file also uses defaults.

## Editor support

Add a schema header for completion and diagnostics. For `apps/web/demo/config/config.yaml`:

```yaml
# yaml-language-server: $schema=../../../../packages/web/config/src/lib/config/web.config.schema.json
url:
  app: http://localhost:8080
```

The schema path is relative to the YAML file.

For the demo, edit `apps/web/demo/config/config.yaml`. Compose mounts its directory
read-only so editor atomic saves remain visible to running containers. The older
`demo/config.yaml` path and the container's working-directory `config.yaml` are
compatibility symlinks; use those logical filenames for commands so existing
relative template/data/prepared paths stay rooted beside content and data. Do not
edit or replace the compatibility links. This is a mount-layout fix, not automatic
server-config reloading.

## Environment references

- `${VAR}` expands an environment variable; missing variables are errors.
- `${VAR:-fallback}` supplies a value when unset. An empty variable counts as set.
- `$$` escapes a dollar sign, so `$${VAR}` remains literal `${VAR}`.

Expansion applies once to string values. Enum settings such as the AI provider
and code-theme names use their supported literal values.

## URLs, storage and paths

| Setting | Default | Purpose |
| --- | --- | --- |
| `url.app` | `${LUZZLE_APP_URL:-http://localhost:8080}` | Public site URL |
| `url.app_assets` | `""` | Application asset base URL |
| `url.luzzle_assets` | `""` | Published piece asset base URL |
| `storage.root` | `./archive` | Markdown archive directory |
| `paths.database` | `./data/luzzle.sqlite` | SQLite index |
| `paths.prepared` | `./data/prepared` | Prepared template bundle revisions (server-only shared data) |
| `paths.assets` | `./assets/pieces` | Generated piece assets |
| `paths.cache` | `./nginx` | Proxy cache |
| `paths.static` | `./static` | Static files |
| `assets.salt` | `${LUZZLE_ASSET_SALT:-}` | Asset-key salt |

`paths.prepared` must be nonempty. Relative values resolve from the directory
containing `config.yaml`; absolute paths stay absolute. Prepared revisions are
server-only artifacts shared by the worker and web, not a public asset folder.
The existing Docker Compose data mounts share `demo/data` between both services,
so the default lives in that shared data directory without an additional mount.
Custom locations must also be accessible to both services.

On-demand template publication is a worker-side producer command; it does not
yet switch production web rendering to prepared bundles. Manual acceptance of
that rendering cutover is still pending.

## Authentication

Omit `auth` for a public-only site with admin access disabled. Otherwise, provide
a nonempty `secret` and exactly one provider.

Credentials:

```yaml
auth:
  secret: ${LUZZLE_AUTH_SECRET}
  credentials:
    username: ${LUZZLE_AUTH_USERNAME}
    password: ${LUZZLE_AUTH_PASSWORD}
```

Or OIDC:

```yaml
auth:
  secret: ${LUZZLE_AUTH_SECRET}
  oidc:
    issuer: ${OIDC_ISSUER}
    clientId: ${OIDC_CLIENT_ID}
    clientSecret: ${OIDC_CLIENT_SECRET}
```

All shown fields are required and nonempty. OIDC also accepts `name`, which
defaults to `Single Sign-On`.

## AI generation

Omit `ai` to disable generation. Both fields are required when configured:

```yaml
ai:
  provider: google
  api_key: ${GOOGLE_API_KEY}
```

## Other settings

| Section | Purpose |
| --- | --- |
| `network` | Internal service addresses and development networking |
| `worker.queue.path` | Workflow queue database path |
| `sync` | Rclone archive and CDN synchronization |
| `content.text` | Site title and description |
| `content.component` | Custom page components |
| `pieces` | Piece types, frontmatter field mappings and components |
| `theme.globals`, `theme.light`, `theme.dark` | Fonts, spacing and color tokens |
| `theme.markdown` | Sidenotes and Shiki code/editor themes |

See the [demo configuration](../../../apps/web/demo/config/config.yaml) for a complete
example, and the schema's field descriptions for defaults and details.
