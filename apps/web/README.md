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
presentation fallback and report failures. No production page uses this loader yet.

The loader is read-only and does not compile, publish or refresh configuration.
It uses immutable revision URLs without timestamp cache-busting. Node retains
imported ES modules for the process lifetime; module-memory management is not yet
solved for production hot replacement.

The shared config's `paths.prepared` defaults to `./data/prepared`, resolved by
`resolvePreparedDirectory(config)` relative to the config file's directory. The
worker's `publish:templates --config <filename>` command publishes there. The
existing Compose data mounts share that default location. The fixture uses this
real command and resolver; production routes still do not consume it.

`pnpm run test:templates` builds a small SvelteKit application once, then publishes
real worker artifacts after that build. It tests SSR HTML/CSS, revision switching
and caller-owned fallback without changing the compiled application. The fixture
also exercises real piece helpers and public/preview URL separation. Page templates
can call `helpers.showNavBanner()` for the app-owned banner with existing defaults,
or pass `{ background, color, hoverColor }` overrides. No call means no banner;
the last call replaces the overrides. The fixture renders the real banner above
custom HTML in the initial server response, with its normal application-owned
client behavior. It also exercises configured/default icons and their stylesheet
collection inside the page's single SSR render. This is not yet production page
cutover, authenticated asset serving, or a browser interaction test.

`createTemplateHelpers(urls)` in `src/lib/server/template-helpers.ts` implements the
shared `helpers.forPiece(piece)` API using existing piece helpers. Callers supply
request-bound builders for piece, asset and static-asset URLs. Capture origin, job
and base values once and keep those builders stable for the render; no page store,
database or filesystem access is performed by the factory. Published and draft
records carry their own asset content—the URL context does not turn one into the
other. Static-file availability and serving remain the caller's responsibility.

`createPageTemplateHelpers(urls, onNavigation)` in the same helper module adds
`showNavBanner` and reports requested color snapshots through the supplied callback.
The base factory remains usable by icon and Open Graph templates.

`renderTemplatePage(bundle, name, data, urls)` in `src/lib/server/template-page.ts`
uses that factory and keeps navigation capture local to one server render.
It returns the unchanged rendered body/head and optional navigation colors. Only
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
