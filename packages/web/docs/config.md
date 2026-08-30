# Web Configuration Reference ⚙️

The Luzzle Web Explorer is configured via `config.yaml`.

> [!NOTE]
> The Web ecosystem uses its own specific configuration schema, distinct from
> the CLI configuration. Make sure to specify the schema header at the top of
> your YAML configuration file:
>
> ```yaml
> # yaml-language-server: $schema=../../config/src/lib/config/web.config.schema.json
> ```

---

## Core Settings

<!-- markdownlint-disable MD013 -->

| Path                | Env Variable        | Required | Default                 | Description                               |
| ------------------- | ------------------- | -------- | ----------------------- | ----------------------------------------- |
| `url.app`           | `LUZZLE_APP_URL`    | Yes      | `http://localhost:8080` | The public URL of your Explorer.          |
| `url.app_assets`    | -                   | Yes      | `""`                    | Base URL for application-specific assets. |
| `url.luzzle_assets` | -                   | Yes      | `""`                    | Base URL for general Luzzle assets.       |
| `paths.database`    | -                   | Yes      | `./data/luzzle.sqlite`  | Path to the SQLite database.              |
| `assets.salt`       | `LUZZLE_ASSET_SALT` | Yes      | `""`                    | Salt used to obfuscate asset file paths.  |

<!-- markdownlint-enable MD013 -->

---

## Storage 📦

<!-- markdownlint-disable MD013 -->

| Path                      | Env Variable | Required | Default      | Description                                        |
| ------------------------- | ------------ | -------- | ------------ | -------------------------------------------------- |
| `storage.type`            | -            | Yes      | `filesystem` | Type of storage backend: `filesystem` or `webdav`. |
| `storage.config.root`     | -            | Yes      | `./archive`  | Path to your Markdown archive.                     |
| `storage.config.url`      | -            | No       | `""`         | WebDAV server URL (required if type is `webdav`).  |
| `storage.config.username` | -            | No       | `""`         | WebDAV username.                                   |
| `storage.config.password` | -            | No       | `""`         | WebDAV password.                                   |

<!-- markdownlint-enable MD013 -->

---

## Authentication 🔐

Luzzle supports OIDC and simple Credentials.

<!-- markdownlint-disable MD013 -->

| Path                        | Env Variable           | Required | Default            | Description                               |
| --------------------------- | ---------------------- | -------- | ------------------ | ----------------------------------------- |
| `auth.enabled`              | -                      | Yes      | `false`            | Set to `true` to enable editing features. |
| `auth.secret`               | `LUZZLE_AUTH_SECRET`   | Yes\*    | -                  | A random secret for session encryption.   |
| `auth.type`                 | -                      | Yes      | `oidc`             | `oidc` or `credentials`.                  |
| `auth.oidc.name`            | -                      | No       | `"Single Sign-On"` | Display name for OIDC login provider.     |
| `auth.oidc.issuer`          | -                      | No\*\*\* | -                  | OIDC issuer URL.                          |
| `auth.oidc.clientId`        | -                      | No\*\*\* | -                  | OIDC client ID.                           |
| `auth.oidc.clientSecret`    | -                      | No\*\*\* | -                  | OIDC client secret.                       |
| `auth.credentials.username` | `LUZZLE_AUTH_USERNAME` | No\*\*   | -                  | Admin username.                           |
| `auth.credentials.password` | `LUZZLE_AUTH_PASSWORD` | No\*\*   | -                  | Admin password.                           |

<!-- markdownlint-enable MD013 -->

\* _Required if `auth.enabled` is `true`._  
\*\* _Required if `auth.type` is `credentials`._  
\*\*\* _Required if `auth.type` is `oidc` and `auth.enabled` is `true`._

---

## Builder 🏗️

The builder settings define how the Explorer triggers background build processes.

<!-- markdownlint-disable MD013 -->

| Path             | Env Variable           | Required | Default | Description                               |
| ---------------- | ---------------------- | -------- | ------- | ----------------------------------------- |
| `builder.url`    | `LUZZLE_BUILDER_TOKEN` | Yes      | -       | The webhook URL to trigger a build.       |
| `builder.method` | -                      | No       | `POST`  | The HTTP method used to call the webhook. |

<!-- markdownlint-enable MD013 -->

---

<!-- markdownlint-disable MD013 -->

## Content & Theme 🎨

| Path                       | Required | Default                      | Description                                                |
| -------------------------- | -------- | ---------------------------- | ---------------------------------------------------------- |
| `content.text.title`       | Yes      | `Luzzle Explorer`            | The title displayed on your site.                          |
| `content.text.description` | Yes      | `A Luzzle Explorer instance` | The site description for SEO and OG tags.                  |
| `theme.globals`            | No       | (Material)                   | Global design tokens (fonts, spacing, radii, breakpoints). |
| `theme.light`              | No       | (Material)                   | Custom colors for light mode.                              |
| `theme.dark`               | No       | (Material)                   | Custom colors for dark mode.                               |
| `theme.markdown.code`      | Yes      | -                            | Shiki themes for code blocks.                              |

<!-- markdownlint-enable MD013 -->

---

## AI Features 🤖

<!-- markdownlint-disable MD013 -->

| Path          | Env Variable     | Required | Default  | Description                  |
| ------------- | ---------------- | -------- | -------- | ---------------------------- |
| `ai.provider` | -                | No       | `google` | Currently supports `google`. |
| `ai.api_key`  | `GOOGLE_API_KEY` | No       | -        | Your Google Gemini API key.  |

<!-- markdownlint-enable MD013 -->

---

## Pieces 🧩

The `pieces` array in `config.yaml` tells Luzzle how to handle different types
of records (maps icons, Open Graph cards, and page layout components to custom
fields). You can learn how to structure these by exploring the sample file in
the [demo/](../explorer/demo/config.yaml) folder.
