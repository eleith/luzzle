# Web development

Use [deployment](deployment.md) to run your archive. This page is for changing Luzzle.

## Start from a checkout

With Docker and Compose installed, work from `apps/web`.
The bundled `demo/config/config.yaml` already uses development service addresses.
Put the secrets it references in `.env`; omit its `ai` block if you don't need AI.

Create an untracked `docker-compose.dev.local.yml` to pass that environment:

```yaml
services:
  luzzle-dev-web:
    env_file: .env
  luzzle-dev-worker:
    env_file: .env
```

Set `LUZZLE_AUTH_SECRET`, `LUZZLE_AUTH_PASSWORD` and, if using AI, `GOOGLE_API_KEY`.
Generate a secret with `openssl rand -hex 32`. Keep `.env` out of Git.

```sh
mkdir -p demo/assets/pieces demo/data nginx/cache nginx/logs
docker compose -f docker-compose.dev.yml -f docker-compose.dev.local.yml up --build
```

Open <http://localhost:8080>. Match mount permissions to your UID/GID.
If you already use mise and fnox, `mise docker up --build` uses the same two files;
keep your existing environment override.

## Make changes

Web source reloads through Vite; worker source uses Node watch mode. Rebuild images
after changing manifests, the lockfile or Dockerfiles. Restart services after YAML
changes. Edit `demo/config/config.yaml`, not the compatibility symlink.

`apps/web/docker-compose.yml` builds production-like images for developer testing.
It is intentionally different from the [published-image example](docker-compose.yml).

Follow the [development checks](../development.md). Keep parsing in `@luzzle/core`,
heavy work in the worker, UI styling on theme tokens, and web/worker/templates on
one exact Svelte version. Shared web packages stay internal with `workspace:*`.
