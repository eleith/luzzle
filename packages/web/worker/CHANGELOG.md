# @luzzle/web.worker

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
