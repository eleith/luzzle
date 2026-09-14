# @luzzle/web.worker

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
