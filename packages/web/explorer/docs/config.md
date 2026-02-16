# Configuration Reference ⚙️

Luzzle Web Explorer is configured via `config.yaml`. Many settings can also be provided via environment variables to support zero-config deployments.

## Core Settings

| Path                | Env Variable        | Required | Default                 | Description                                                                         |
| ------------------- | ------------------- | -------- | ----------------------- | ----------------------------------------------------------------------------------- |
| `url.app`           | `LUZZLE_APP_URL`    | Yes      | `http://localhost:8080` | The public URL of your Explorer.                                                    |
| `url.app_assets`    | -                   | Yes      | `""`                    | Base URL for application-specific assets.                                           |
| `url.luzzle_assets` | -                   | Yes      | `""`                    | Base URL for general Luzzle assets.                                                 |
| `paths.database`    | -                   | Yes      | `./data/luzzle.sqlite`  | Path to the SQLite database.                                                        |
| `assets.salt`       | `LUZZLE_ASSET_SALT` | Yes      | `""`                    | Salt used to obfuscate asset file paths. If empty, paths are hashed without a salt. |

## Storage 📦

| Path                      | Env Variable | Required | Default      | Description                                        |
| ------------------------- | ------------ | -------- | ------------ | -------------------------------------------------- |
| `storage.type`            | -            | Yes      | `filesystem` | Type of storage backend: `filesystem` or `webdav`. |
| `storage.config.root`     | -            | Yes      | `./archive`  | Path to your Markdown archive.                     |
| `storage.config.url`      | -            | No       | `""`         | WebDAV server URL (required if type is `webdav`).  |
| `storage.config.username` | -            | No       | `""`         | WebDAV username.                                   |
| `storage.config.password` | -            | No       | `""`         | WebDAV password.                                   |

## Authentication 🔐

Luzzle supports OIDC and simple Credentials.

| Path                        | Env Variable           | Required | Default | Description                               |
| --------------------------- | ---------------------- | -------- | ------- | ----------------------------------------- |
| `auth.enabled`              | -                      | Yes      | `false` | Set to `true` to enable editing features. |
| `auth.secret`               | `LUZZLE_AUTH_SECRET`   | Yes\*    | -       | A random secret for session encryption.   |
| `auth.type`                 | -                      | Yes      | `oidc`  | `oidc` or `credentials`.                  |
| `auth.credentials.username` | `LUZZLE_AUTH_USERNAME` | No\*\*   | -       | Admin username.                           |
| `auth.credentials.password` | `LUZZLE_AUTH_PASSWORD` | No\*\*   | -       | Admin password.                           |

\* _Required if `auth.enabled` is `true`._
\*\* _Required if `auth.type` is `credentials`._

## Builder 🏗️

The builder settings define how the Explorer triggers background build processes.

| Path             | Env Variable           | Required | Default | Description                               |
| ---------------- | ---------------------- | -------- | ------- | ----------------------------------------- |
| `builder.url`    | `LUZZLE_BUILDER_TOKEN` | Yes      | -       | The webhook URL to trigger a build.       |
| `builder.method` | -                      | No       | `POST`  | The HTTP method used to call the webhook. |

## Content & Theme 🎨

| Path                       | Required | Default                      | Description                               |
| -------------------------- | -------- | ---------------------------- | ----------------------------------------- |
| `content.text.title`       | Yes      | `Luzzle Explorer`            | The title displayed on your site.         |
| `content.text.description` | Yes      | `A Luzzle Explorer instance` | The site description for SEO and OG tags. |
| `theme.light`              | No       | (Material)                   | Custom colors for light mode.             |
| `theme.dark`               | No       | (Material)                   | Custom colors for dark mode.              |
| `theme.markdown.code`      | Yes      | -                            | Shiki themes for code blocks.             |

## AI Features 🤖

| Path          | Env Variable        | Required | Default  | Description                  |
| ------------- | ------------------- | -------- | -------- | ---------------------------- |
| `ai.provider` | -                   | No       | `google` | Currently supports `google`. |
| `ai.api_key`  | `LUZZLE_AI_API_KEY` | No       | -        | Your Google Gemini API key.  |

## Pieces 🧩

The `pieces` array in `config.yaml` tells Luzzle how to handle different types of records. You can learn how to structure these by exploring the `sample/` folder in this repository.
