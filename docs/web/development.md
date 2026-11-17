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
mkdir -p demo/assets/pieces demo/assets/previews demo/data nginx/cache nginx/logs
docker compose -f docker-compose.dev.yml -f docker-compose.dev.local.yml up --build
```

Open <http://localhost:8080>. Match mount permissions to your UID/GID.
If you already use mise and fnox, `mise docker up --build` uses the same two files;
keep your existing environment override.

## Make changes

Web source reloads through Vite; worker source uses Node watch mode. Rebuild images
after changing manifests, the lockfile or Dockerfiles. Restart services after YAML
changes. After changing a page or icon template selection in YAML, also reload open
browser tabs: each browser document keeps its routing configuration, and SvelteKit caches
internal route choices during client navigation. Changing a selection among the
built-in templates does not require rebuilding the app.
Edit `demo/config/config.yaml`, not the compatibility symlink.

When running outside Docker, start development with `node scripts/manager.js`
or an existing production build with `node scripts/start-server.js`, from `apps/web`
with its `config.yaml` and runtime environment ready. The manager is development-only;
production must be built before startup. These launchers prepare the YAML-derived
startup environment before starting Vite or Kit; invoking `vite dev` or `build/index.js`
directly bypasses that preparation. No generated `.env` file is needed.

## Template changes

`@luzzle/web.templates` owns component contracts and client loading through its
`icons/client`, `pages/client`, and `opengraphs/client` exports. Each accepts a
selected `name` and `children`, `pending`, and `failed` snippets. Web supplies the
application UI, navigation, and asset helpers; public SSR routes still import their
selected component directly.

The public page/icon route adapters are generated from the existing template schema
catalogs and are ignored by Git. Shared layouts and server loaders remain handwritten.
Do not edit generated `+page.svelte` files; change the template or the generator in
`scripts/template-routes/generate.js` instead. That folder groups the generate/clean
entrypoints, shared file helpers, and their behavior test.

After installing and building shared packages, `pnpm run dev`, `build`, `check`, and
`check:watch` generate adapters before synchronizing Kit's route types. From a fresh
checkout, run `pnpm run sync:svelte` before relying on editor route types. You can also
run `pnpm run generate:template-routes` on its own. To remove generated adapters, use
`pnpm run clean:template-routes`; it preserves shared layouts and unmarked files, and
requires neither site configuration nor a built template package. Empty directories
may remain. Do not delete the whole `src/routes/templates` folder: its shared layouts
are handwritten. The next sync/dev/build/check recreates generated adapters.
Direct Vite/Kit CLI commands bypass this preparation. Generation does not read `config.yaml`, secrets, or site data; it
includes every available built-in page/icon template. Production startup only serves
the compiled build and does not generate routes.

When adding or removing a built-in template, rebuild `@luzzle/web.templates` and
restart local development. In Docker, rebuild/recreate the web image: built package
metadata and manifests are not source-mounted, so rebuilding packages on the host is
not enough. Existing template component edits still hot-reload. Generation writes
ignored adapters through the web source bind mount using the configured UID/GID.
Changing a YAML selection among existing templates still only requires a server
restart and browser reload, not regeneration or rebuilding assets.

Keep template content tests in the package and application behavior tests in web.
Do not add template CSS inventories, visual snapshots, or style/layout assertions.
Check visual changes manually instead.

## Test a local production build

From `apps/web`, create an untracked `docker-compose.prod.local.yml`, just as you
have a local override for development. With fnox, explicitly forward its variables
to the production services; exporting them to Compose alone does not put them in
the containers:

```yaml
services:
  luzzle-web:
    environment:
      - LUZZLE_AUTH_SECRET
      - LUZZLE_AUTH_PASSWORD
      - GOOGLE_API_KEY
  luzzle-worker:
    environment:
      - LUZZLE_AUTH_SECRET
      - LUZZLE_AUTH_PASSWORD
      - GOOGLE_API_KEY
```

Add any other variables referenced by your YAML. Do not forward `LUZZLE_DEV`.
Alternatively, use `.env` and an empty local override (`services: {}`). The base
production Compose file reads `.env` when present; it is optional (Compose 2.24+
required). Image builds also require `$HOME/.npmrc`, passed as a BuildKit secret.

The shared mise config defines `docker-prod`; a `mise.local.toml` override of
`docker` does not override this separate task.

Stop the dev stack before starting the production build. Both stacks use port
8080 (and 9001) and share the demo archive, database and asset directories.

```sh
mise docker down
mise docker-prod up --build
```

Open <http://localhost:8080>. This runs the compiled app rather than Vite's dev
server, so you can inspect production JS/CSS requests. There is no hot reload;
use `--build` again after source changes.

The production Compose file supplies internal web/worker URLs through environment
variables; the demo YAML defaults to dev URLs when those variables are absent.
You do not need to edit the YAML when switching stacks.

To return to development:

```sh
mise docker-prod down
mise docker up
```

Without mise/fnox, the production command is
`docker compose -f docker-compose.yml -f docker-compose.prod.local.yml up --build`
with the required environment configured. This local-build Compose file is
intentionally different from the [published-image example](docker-compose.yml).

Follow the [development checks](../development.md). Keep parsing in `@luzzle/core`,
heavy work in the worker, UI styling on theme tokens, and web/worker/templates on
one exact Svelte version. Shared web packages stay internal with `workspace:*`.

## Browser tests

After building shared packages, install Chromium's headless shell and build the web app:

```sh
pnpm --filter @luzzle/web exec playwright install --with-deps --only-shell chromium
pnpm --filter @luzzle/web build
pnpm --filter @luzzle/web test:e2e
```

The Playwright suite covers saved editing and Vim controls, retaining drafts when
publication status fails, search, and a few reading regressions. It uses one
Chromium worker against the production build, with a temporary archive/config and
a real SQLite index, not your demo or live data. Preview/Publish job requests are
intercepted. It runs no worker, LSP or external identity/storage services and does
not prove live publication.

GitHub and Woodpecker reuse the app build from `test:templates` in their existing
test jobs. Both use the prebuilt Playwright image used by When/Directory: GHCR on
GitHub, the Gitea mirror on Woodpecker. Keep the image/browser version aligned with
`@playwright/test`. Failed journeys retain traces, screenshots and server logs
under `apps/web/test-results`; GitHub uploads those artifacts. There is no second
build, browser matrix or automatic retry.
