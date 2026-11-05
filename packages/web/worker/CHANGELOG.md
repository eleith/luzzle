# @luzzle/web.worker

## 0.0.248

### Patch Changes

- 2c66a44: Use softer, near-white surface containers in the default light palette and the bundled demo. Preserve dark palettes, accent colors and existing focus behavior.
- @luzzle/core@0.0.248
  - @luzzle/web.db@0.0.1
  - @luzzle/web.jobs@0.0.1
  - @luzzle/web.pieces@0.0.1
  - @luzzle/web.templates@0.0.1

## 0.0.247

### Patch Changes

- 3495dda: Support local WOFF2 via `content.fonts.sans` for browser text and worker OG images. Serve configured images and fonts at `/assets/{role}/{filename}` using URL-encoded basenames and revalidation. Reread files on use; only config changes need a restart. Preserve bundled defaults when omitted.
- @luzzle/core@0.0.247
  - @luzzle/web.db@0.0.1
  - @luzzle/web.jobs@0.0.1
  - @luzzle/web.pieces@0.0.1
  - @luzzle/web.templates@0.0.1

## 0.0.246

### Patch Changes

- @luzzle/core@0.0.246
  - @luzzle/web.db@0.0.1
  - @luzzle/web.jobs@0.0.1
  - @luzzle/web.pieces@0.0.1
  - @luzzle/web.templates@0.0.1

## 0.0.245

### Patch Changes

- 3dbf10c: Align development and CI on Node 26, pnpm 11.2.2, TypeScript 6 and Vitest 4.
  Keep web, worker and template Svelte versions aligned at 5.57.3. Preserve the
  LSP executable's `dist/index.js` layout and exclude CLI test mocks from production
  builds. Include untested production files in coverage without lowering thresholds.
  CLI command behavior, core APIs and the archive format are unchanged.
- b20ce15: Upgrade OpenWorkflow to 0.11.0, using native backend/lifecycle ownership and
  ordered worker resource shutdown. Schedule expired preview-file and application
  progress/log cleanup with durable cron jitter near 02:00 UTC instead of startup
  runs or process-local timers. Preserve active jobs and OpenWorkflow engine
  history; application cleanup does not purge engine job records.
- 8ec14ec: Ship a prebuilt, author-independent web image that reads YAML at startup without
  rebuilding the application. Discover piece types at runtime, keep framework
  JavaScript/CSS same-origin, and apply configured asset prefixes to CSP without
  relaxing native CSRF checks. Development images need no host npm credentials;
  configuration-directory mounts support atomic saves without adding hot reload.

  **Upgrade:** use the published-image Compose/config examples and deploy the web
  stack together. `url.app_assets` affects app-owned static files, not framework
  chunks. Rebuild/recreate existing checkout-based containers for the new image
  and config-directory layout; config changes thereafter require restart, not an
  app build. Back up archive/data and let active jobs finish before upgrading.

- 44e8385: Choose pending additions and updates in a consistent publishing table with
  separate edit links, local/remote checks, retained results and a fresh check
  before retrying. Keep unselected work pending while still applying global
  removals and schema housekeeping. Capture audited selections and hashes across
  worker retries, and deduplicate replayed progress logs. Omitted selections retain
  publish-all behavior.
- 55cb722: Select independent built-in icon, page and Open Graph templates through YAML,
  with nine named choices per role and poster-style defaults. Map metadata into
  template-owned fields, including structured lists and snippet assets; missing
  or null optional values use defaults without hiding invalid mappings. Archive
  types remain independent of presentation choices. The worker retains native
  runtime OG compilation, caching and PNG rendering.

  **Upgrade:** replace `pieces[].components` Svelte source paths with
  `pieces[].templates` selections and role-specific mappings. Executable author
  Svelte sources are no longer supported.
  Restart web/worker after changing mappings, then edit/save and republish affected
  pieces when regenerated OG assets are needed.

- 6458f9c: Add inline Unpublish to the editor's More menu, with progress and failure
  feedback that preserves drafts. Withdraw the public record and attempt exact
  local/configured-remote deletion of recorded, unshared generated files, including
  copy-mode assets. Preserve archive originals and assets still used by other
  pieces; retain configured rclone flags. Unpublish is one attempt, without
  automatic replay or rollback, and requires a fresh publication check afterward.
  Cleanup can fail after the public record has been removed.
- Updated dependencies [3dbf10c]
  - @luzzle/core@0.0.245
- Internal dependency versions remain unchanged: `@luzzle/web.db`,
  `@luzzle/web.jobs`, `@luzzle/web.pieces` and `@luzzle/web.templates` remain at `0.0.1`.

## 0.0.244

### Patch Changes

- 9e5e21b: Generate attachment copies during preview and use only worker-generated attachment references, while preserving image fallbacks.
- ac811d6: Reduce generated Open Graph PNG sizes using the existing Sharp dependency's palette encoder. Keep the original whenever encoding would not reduce file size, and preserve image paths and MIME types. Palette encoding trades some color fidelity for smaller previews.
- f245075: Add a Published piece viewer and align Preview with shared Overview and composition-only Share views, including inline output inspection. Replace legacy Live/OG navigation with View → Published / Preview and Share.

  Record successful per-piece publication times, sync saved Markdown to its index, and compare indexed and published hashes.

  Restrict public and Preview asset file access to validated directories, including resolved symlink targets.

- @luzzle/core@0.0.244
  - @luzzle/web.db@0.0.1
  - @luzzle/web.jobs@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.243

### Patch Changes

- 9510636: Include failed-piece details in publish results while continuing healthy work and CDN/cache phases. Report completed batches with asset failures as partial in progress streams and show an explicit error summary instead of Published successfully, including on reload. Preserve ordinary success and legacy outcomes; encode piece links correctly.
- 671a7db: Track successfully published Markdown content hashes so Check and Publish can find unfinished pieces after indexing has already advanced. Record success only after asset, CDN, and cache phases finish, leaving failed pieces pending for a later publish. Initialize existing web rows from their indexed hashes during migration. Deploy after existing publish jobs have finished; older interrupted jobs must not resume across this upgrade.
- 407b42d: Propagate transform and image-preparation errors instead of treating them as successful empty output. Wait for image variant writes to settle before reporting failure, skip asset-record persistence when production fails, collect failed-piece details and continue processing healthy pieces. Previously written files and metadata are not rolled back.
- 62a929e: Keep progress logs and rclone output scoped to each workflow run and phase, including preview parsing and transforms. Preserve log line ordering and resume numbering without changing the shared worker logging destination.
- Updated dependencies [f1cf0d8]
- Updated dependencies [cb3d3b7]
- Updated dependencies [be8fb0f]
- Updated dependencies [1eec1d9]
- Updated dependencies [039bec5]
- Updated dependencies [a12e8bd]
- Updated dependencies [981f629]
- Updated dependencies [b194368]
- Updated dependencies [ace30b0]
- Updated dependencies [31e8716]
- Updated dependencies [d537423]
- Updated dependencies [a6e0f1f]
- Updated dependencies [dcf61ba]
- Updated dependencies [911a261]
  - @luzzle/core@0.0.243
  - @luzzle/web.db@0.0.1
  - @luzzle/web.jobs@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.242

### Patch Changes

- @luzzle/core@0.0.242
  - @luzzle/web.db@0.0.1
  - @luzzle/web.jobs@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.241

### Patch Changes

- fc467ac: Add an admin dashboard (`/admin`, replacing the old redirect to the create form) showing piece/asset stats, recently-edited pieces, and setup status, plus an `/admin/health` page with live checks (storage, worker, auth issuer, archive/cdn sync, AI key) that can each be re-run on demand. Archive/cdn checks run through a new `TestConnectivity` worker workflow since the web app has no rclone binary or credentials of its own.
- Updated dependencies [fc467ac]
  - @luzzle/core@0.0.241
  - @luzzle/web.db@0.0.1
  - @luzzle/web.jobs@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.240

### Patch Changes

- @luzzle/core@0.0.240
  - @luzzle/web.db@0.0.1
  - @luzzle/web.jobs@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.239

### Patch Changes

- ab8b10a: Resume job_progress_logs line numbering from the last persisted line instead of always restarting at 0, fixing a UNIQUE constraint failure when a durable workflow step retries or resumes the same phase.
- @luzzle/core@0.0.239
  - @luzzle/web.db@0.0.1
  - @luzzle/web.jobs@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.238

### Patch Changes

- @luzzle/core@0.0.238
  - @luzzle/web.db@0.0.1
  - @luzzle/web.jobs@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.237

### Patch Changes

- @luzzle/core@0.0.237
  - @luzzle/web.db@0.0.1
  - @luzzle/web.jobs@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.236

### Patch Changes

- @luzzle/core@0.0.236
  - @luzzle/web.db@0.0.1
  - @luzzle/web.jobs@0.0.1
  - @luzzle/web.pieces@0.0.1
