# @luzzle/web 🔎

The SvelteKit application for browsing, searching, and editing your Luzzle
archives in a responsive web manager interface.

## Editor Keybindings

Source and text-asset editors receive focus automatically when opened.

Source and text-asset editors default to Standard keybindings. Press
**Ctrl+Alt+V** while the editor is focused to toggle Vim keybindings. The choice
is remembered in this browser and reused when opening another editor.

A small editor footer shows Standard or the current Vim mode, alongside the
shortcut hint. It is informational; Ctrl+Alt+V remains the only toggle. Save
continues to use the existing Save button; Vim Save/quit commands are not connected
to application actions. Before applying generated content, the editor finishes Vim's current
insertion and returns to Normal mode, keeping generation outside dot-repeat.

If Vimium is installed, exclude the editor URLs in its settings and leave the
excluded-keys field empty. Vimium otherwise intercepts Escape before the editor
can return to Normal mode.

## Prepared template loading

`loadTemplateBundle(preparedDirectory)` in `src/lib/server/templates.ts` reads
`current.json` once and loads that revision's renderer, lookup and theme CSS.
It returns `null` if no revision is selected; malformed output and genuine
filesystem/module/rendering errors are not silently swallowed. Callers choose
presentation fallback and report failures. Public piece detail, admin published-page,
and completed preview-page views now use it through `renderPreparedPiecePage`.

The loader is read-only and does not compile, publish or refresh configuration.
It uses immutable revision URLs without timestamp cache-busting. Node retains
imported ES modules for the process lifetime; module-memory management is not yet
solved for production hot replacement.

The shared config's `paths.prepared` defaults to `./data/prepared`, resolved by
`resolvePreparedDirectory(config)` relative to the config file's directory. The
worker's `publish:templates --config <filename>` command publishes there. The
existing Compose data mounts share that default location. The real page loaders
use the same path resolver; no publication command runs automatically on request.

`pnpm run test:templates` builds a small SvelteKit application once, then publishes
real worker artifacts after that build. It tests SSR HTML/CSS, revision switching
and caller-owned fallback without changing the compiled application. The fixture
also exercises real piece helpers and public/preview URL separation. Page templates
can call `helpers.showNavBanner()` for the app-owned banner with existing defaults,
or pass `{ background, color, hoverColor }` overrides. No call means no banner;
the last call replaces the overrides. The fixture renders the real banner above
custom HTML in the initial server response, with its normal application-owned
client behavior. It also exercises configured/default icons and their stylesheet
collection inside the page's single SSR render. A second suite builds the actual
application before owner sources exist and exercises the real public detail route
with a runtime-configured type, publication, fallback, assets, SEO and unchanged
build hashes. Anonymous admin-route checks do not establish authenticated preview
HTML or browser interaction acceptance; those remain part of manual verification.
Run this suite in a blank checkout/CI: its real-app build refuses to replace a
nonblank local `config.yaml` or `.env`, and restores absent/blank files afterward.

`createTemplateHelpers(urls)` in `src/lib/pieces/template-helpers.ts` implements the
shared `helpers.forPiece(piece)` API using existing piece helpers. Callers supply
request-bound builders for piece, asset and static-asset URLs. Capture origin, job
and base values once and keep those builders stable for the render; no page store,
database or filesystem access is performed by the factory. Published and draft
records carry their own asset content—the URL context does not turn one into the
other. Static helpers construct URLs for valid relative paths; they do not check
whether files are published. Missing files produce normal HTTP 404s. `paths.static`
does not itself publish source files; runtime static publication remains separate.

`createPageTemplateHelpers(urls, onNavigation)` in `src/lib/server/template-helpers.ts` adds
`showNavBanner` and reports requested color snapshots through the supplied callback.
The base factory remains usable by icon and Open Graph templates.

`renderTemplatePage(bundle, name, data, urls)` in `src/lib/server/template-page.ts`
uses that factory and keeps navigation capture local to one server render.
It returns the unchanged rendered body/head and `navBanner`: `null` means no
banner, `{}` requests defaults, and supplied colors override those defaults. Only
the three color fields are copied; visibility flags, snippets, and other banner
props are not part of the author API. Render failures reach the caller before any
partial presentation is returned. Icon and Open Graph inputs retain their base
helpers, without navigation controls.

Page and Open Graph authors embed icons with
`<components.PieceIcon piece={data.piece} size={{ width: 125 }} />`. The bundle
supplies this actual component internally; no constructor crosses from the app.
Icons share the enclosing Svelte render, including CSS collection, component
context and ordinary head ordering (an icon title can replace a direct page
title). A failing icon aborts the enclosing render and reaches caller-owned
fallback. Missing icons use the canonical `icon.default.svelte` UI, shared with
the legacy app adapter through the components asset family in `@luzzle/web.templates`.

The prepared module's public renderer/lookup/body/head contract is unchanged.

## Piece-page cutover and manual verification

The page loaders pin one selected revision and return only rendered HTML/head,
matching theme CSS, and explicit `navBanner` state. Templates receive a copy of serving
data so a failed render cannot mutate the built-in fallback's record. Missing bundles/page overrides or
presentation failures use the canonical default page body and icon in
`@luzzle/web.templates` directly, never another custom template dispatcher. The app
adapter retains navigation and request-bound helper wiring. Existing authentication and private `no-store` handling remain in
place; previews render only after the selected job completes, with that job's asset
URLs. The remaining app icon consumer uses the same v1 icon props so list/search
icons continue working with migrated demo sources.

For this milestone **SEO is app-owned**: title, description, Open Graph metadata,
favicon and theme bootstrap retain their existing owners. Templates may supply
styles and non-conflicting head content, but must not emit competing SEO tags.
There is no new source validator or automatic head merger.

Publish from the worker using the same config/data location loaded by web. For an
already-built production Compose stack:

```sh
docker compose -f apps/web/docker-compose.yml exec luzzle-worker \
  node dist/src/commands/publish-templates.js --config /app/config.yaml
```

For the mise Docker development stack, run the source entrypoint with the same
loader flags used by the worker service (no `dist` build is required). The dev
Compose file mounts the shared templates source into both services; run
`mise docker up -d luzzle-dev-web luzzle-dev-worker` once after updating Compose
to apply those mounts:

```sh
mise docker exec luzzle-dev-worker node \
  --experimental-strip-types --conditions=development \
  --import ../../../tools/register.mjs src/commands/publish-templates.ts
```

For local development, build the worker and pass the actual web config's absolute
filename to `pnpm --filter @luzzle/web.worker run publish:templates --config ...`.
Paths are relative to that filename's directory, not a symlink target or a different
copy of the config. Republish after page/icon/theme edits, then refresh the page.

Manual acceptance checklist:

- Public page content, palette-matched banner, icon and styles appear immediately.
- Page source and theme edits appear after publication without rebuilding the served app.
- Initial HTML retains app SEO, with one document title and no competing template SEO.
- A missing or throwing override shows the built-in page, without partial custom CSS/nav.
- Authenticated published and two completed preview jobs keep the right records/assets;
  pending, failed and expired previews do not render a prepared page.
- Authenticated responses retain private `no-store` caching. Anonymous JSON denials
  are covered by HTTP tests; existing anonymous redirects currently omit the intended
  cache header and need separate hardening. This slice does not change auth hooks.
- Theme/search controls, client navigation, admin edit shortcut and list icons still work.

Public detail URLs are unchanged. Their type check now uses runtime server config;
other listing/API/feed/admin-open matchers and search type discovery remain on the
existing build-time catalog. Changing server settings such as configured types or site text requires a server
restart because server config is cached. Root/feed/error templates, standalone icon/share
surfaces, automatic preparation, runtime static publication, and final prebuilt
packaging remain later work. Dev/build tooling can still compile remaining legacy
surfaces; this is not a claim that all application rebuild couplings are removed.

## Transitional startup and author folders

Demo author files use ambient types from their portable `luzzle.d.ts`; authors do
not need workspace imports or installed `@luzzle` packages. The ambient file is a
snapshot of the current API, not a separate runtime or schema-derived SDK generator.

`manager.js` still launches development and performs the existing production
startup build. It is transitional: production should launch the prebuilt server
directly after the remaining build-time couplings are removed. Likewise,
`sync-piece-content.js` still copies icons/Open Graph sources for legacy consumers;
it and the site-content sync path can be removed once those consumers cut over.

## Centralized Web Documentation 📖

All documentation, including deployment references, configuration setups, and
styling/development standards, has been consolidated:

- **Web Development Standards:** Read
  [packages/web/docs/development.md](../../packages/web/docs/development.md) for style and
  architecture rules.
- **Deployment Reference:** Read
  [packages/web/docs/deployment.md](../../packages/web/docs/deployment.md) for how the Explorer
  runs inside Docker alongside sidecars (Worker, LSP, Proxy).
- **Configuration Reference:** Read
  [packages/web/docs/config.md](../../packages/web/docs/config.md) for settings inside
  `config.yaml`.

---

## Quick Start 🚀

The fastest way to test out the Explorer locally is via Docker Compose. The
`demo/` folder contains a ready-to-run environment with sample data.

1. **Start the containers:**

   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

2. **Access the frontend:**
   Open [http://localhost:8080](http://localhost:8080) in your browser.
