# @luzzle/web

## 0.0.243

### Patch Changes

- 3735b03: Only rewrite `.assets/` Markdown destinations to the admin asset editor; keep other links pointed at their authored URLs.
- d931e3a: Recognize HTTP(S) asset URLs regardless of scheme capitalization when saving piece source, converting them to local assets before validation.
- 25e79ff: Offer a publish shortcut for new or stale pieces that opens the site-wide publish page and automatically checks for changes.
- 094e73c: Simplify the dashboard publish card to show a compact relative time or "never" above the "last published" label.
- 4ebf90d: Report YAML configuration syntax failures as `ConfigError` issues with the parser category and one-based line/column, without quoting source text.
- 71d40d3: Use the configured Shiki light/dark themes for source and asset editor palettes instead of fixed Gruvbox colors. Keep native CodeMirror highlighting and editing behavior, with a bounded Markdown/YAML color mapping and no Shiki tokenizer in the browser.
- 63f11c7: Keep the publish report on its loading state until the current run's results have refreshed, rather than briefly displaying results from a previous run.
- 039bec5: Generate one or more metadata fields, or append to the Markdown body, directly from the source editor. Metadata generation starts with all fields selected and the field picker focused. Generation shows inline progress and applies one undoable, unsaved document update. Creation stays a simple create-and-edit flow; the separate generator page is retired.

  The core generation APIs are `generatePieceFrontmatter` and `generatePieceBody`, with `FrontmatterGenerationRequest` describing a metadata request. The CLI assistant calls `generatePieceFrontmatter` directly; the obsolete `pieceFrontMatterFromPrompt` export is removed. Command options and final-only output are unchanged.

  Allow HTTP(S) asset URLs in generated content and resolve them on Save. Preserve strict stored-piece validation. Share SSE transport without sharing generation and workflow progress screens.

- 31a6865: Add opt-in Vim keybindings to source and text-asset editors, toggled with Ctrl+Alt+V and remembered in the browser. Keep Standard as the default, show the current keybinding mode in a quiet editor footer, retain configured editor colors, and finish Vim input before applying generated content. Saving and navigation continue to use the existing application controls.
- e940b09: Show generation failures in the admin UI without creating a piece when generation fails, preserve retry inputs, and report errors when saving reviewed generated content.
- b57b93b: Show the admin shortcut only on the home page, and use the home arrow as the sole left navigation icon on other public pages. Remove the redundant gear shortcut from piece listings.
- b194368: Set a five-minute Google SDK request timeout and a seven-minute Nginx read timeout for admin generation routes so SDK timeouts can display an application error instead of a gateway timeout page.
- a29898c: Upgrade OpenWorkflow to 0.9.2 and serialize publish and audit check-and-enqueue requests within one web process. Check the latest five runs per workflow through the SDK, retain active-run conflict responses and audit checks, and release admission on enqueue failure. Older active runs outside that window are not detected.
- 9510636: Include failed-piece details in publish results while continuing healthy work and CDN/cache phases. Report completed batches with asset failures as partial in progress streams and show an explicit error summary instead of Published successfully, including on reload. Preserve ordinary success and legacy outcomes; encode piece links correctly.
- 671a7db: Track successfully published Markdown content hashes so Check and Publish can find unfinished pieces after indexing has already advanced. Record success only after asset, CDN, and cache phases finish, leaving failed pieces pending for a later publish. Initialize existing web rows from their indexed hashes during migration. Deploy after existing publish jobs have finished; older interrupted jobs must not resume across this upgrade.
- e5d1b69: Remove the unused standalone `POST /api/admin/preview` endpoint. UI preview submission through the page loader and the preview progress stream remain unchanged.
- 13cfc5e: Use OpenWorkflow SDK APIs for workflow metadata reads in publish/preview pages, dashboard, connectivity checks and progress streams. Preserve existing payload shapes and step-attempt ordering, remove the unused numeric job-ID lookup and the web's raw queue connection, and keep retention cleanup SQL unchanged because the SDK has no purge API.
- 4bcfba2: Show only one left navigation icon in admin: the home arrow on the dashboard and the admin link on other pages.
- cc2940e: Migrate the shared `@luzzle/web.config` contract used by `@luzzle/web` to TypeBox-authored schemas, inferred TypeScript types, and runtime defaulting/validation. Remove config's AJV and json2ts machinery; core retains AJV for piece schemas. Keep one generated editor artifact at `src/lib/config/web.config.schema.json`, preserving existing YAML modelines, and remove the former strict `schema.json`.

  This is a breaking configuration migration in 0.x:

  - Omit `auth` for a public-only site with admin access disabled. When configured, remove `auth.enabled` and `auth.type`, select exactly one of `credentials` or `oidc`, and explicitly supply a nonempty `secret` plus nonempty provider credentials. OIDC `name` still defaults to `Single Sign-On`; no new session-secret length minimum is imposed.
  - Omit `ai` to disable generation, or explicitly supply `provider: google` and a nonempty `api_key`. Auth and AI environment references must be written explicitly in YAML.
  - Missing `${VAR}` references anywhere now fail loading with variable-name/field-path diagnostics rather than secret values. `${VAR:-fallback}`, `$$` escaping, single-pass string expansion, and empty environment values counting as present remain supported. Resolved values are validated at runtime; the editor cannot inspect deployment variables.

  Update configuration and deployment documentation for input defaults versus resolved types, authentication and AI migration, actual `storage.root`/sync settings (no `builder`), path resolution, and standalone editor-schema generation via `build:external-schema`.

  The release is recorded against `@luzzle/web` because repository Changesets policy excludes the internal-only `@luzzle/web.config` package from versioning.

- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.242

### Patch Changes

- b6d238a: Fix keyboard navigation in the create form's directory/type combobox: arrow keys stopped working after typing a filter letter, caused by an upstream bits-ui bug (fixed in 2.19.1) where custom item filtering desynced the internal highlighted-item tracking. Also disable the input's browser autocomplete, which was competing with the combobox's own accessible listbox for arrow-key/Enter handling.
- 0ccbcb6: Fix the editor's kebab menu rendering behind other floating content (bits-ui was reading z-index off the wrong element) and add a "live" menu item that opens the piece's public page in a new tab when one exists. "preview" is now hidden once the draft matches what's already live, since there'd be nothing new to preview.
- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.241

### Patch Changes

- fc467ac: Add an admin dashboard (`/admin`, replacing the old redirect to the create form) showing piece/asset stats, recently-edited pieces, and setup status, plus an `/admin/health` page with live checks (storage, worker, auth issuer, archive/cdn sync, AI key) that can each be re-run on demand. Archive/cdn checks run through a new `TestConnectivity` worker workflow since the web app has no rclone binary or credentials of its own.
- 12a291b: Replace the hardcoded ▼ arrow in the `Combobox` component and the search dialog's type `Select` with a shared `ph:caret-up-down` icon, and fix the combobox trigger button only showing the currently selected item instead of the full list.
- 28082fb: Replace the directory and type dropdowns on the piece create form with a searchable combobox (new shared `Combobox` component built on bits-ui), so directories and types can be filtered by typing instead of scrolling a plain select.
- f5940ed: Fix an intermittent bug where saving a newly generated/created piece and being redirected back to its source editor could show stale pre-save content (edits appeared lost, though they were saved correctly). Caused by SvelteKit reusing a hover-preloaded page fetched before the save completed; `invalidateAll()` is now called before navigating away on save.
- a75fe89: Manage local dev secrets and docker compose tasks with mise + fnox instead of a plain `.env` file, so dev credentials have safe placeholder defaults committed alongside the config.
- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.240

### Patch Changes

- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.239

### Patch Changes

- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.238

### Patch Changes

- Include @luzzle/web.proxy and @luzzle/web.lsp in the synchronized release group.
- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.237

### Patch Changes

- Fix Woodpecker CI YAML parsing for tag version extraction.
- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.236

### Patch Changes

- 66f2919: Add support for configurable OIDC provider name (defaulting to "Single Sign-On"), state verification checks in OIDC provider, and updated signin page UI.
- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1
