---
"@luzzle/web": minor
---

Migrate the shared `@luzzle/web.config` contract used by `@luzzle/web` to TypeBox-authored schemas, inferred TypeScript types, and runtime defaulting/validation. Remove config's AJV and json2ts machinery; core retains AJV for piece schemas. Keep one generated editor artifact at `src/lib/config/web.config.schema.json`, preserving existing YAML modelines, and remove the former strict `schema.json`.

This is a breaking configuration migration in 0.x:

- Omit `auth` for a public-only site with admin access disabled. When configured, remove `auth.enabled` and `auth.type`, select exactly one of `credentials` or `oidc`, and explicitly supply a nonempty `secret` plus nonempty provider credentials. OIDC `name` still defaults to `Single Sign-On`; no new session-secret length minimum is imposed.
- Omit `ai` to disable generation, or explicitly supply `provider: google` and a nonempty `api_key`. Auth and AI environment references must be written explicitly in YAML.
- Missing `${VAR}` references anywhere now fail loading with variable-name/field-path diagnostics rather than secret values. `${VAR:-fallback}`, `$$` escaping, single-pass string expansion, and empty environment values counting as present remain supported. Resolved values are validated at runtime; the editor cannot inspect deployment variables.

Update configuration and deployment documentation for input defaults versus resolved types, authentication and AI migration, actual `storage.root`/sync settings (no `builder`), path resolution, and standalone editor-schema generation via `build:external-schema`.

The release is recorded against `@luzzle/web` because repository Changesets policy excludes the internal-only `@luzzle/web.config` package from versioning.
