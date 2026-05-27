# @luzzle/web.jobs ⚙️

Internal shared package that defines background job types, payload models, and
job queue instantiations for Luzzle.

## Purpose 🧠

This library defines the schemas, payload interfaces, and results for tasks
processed by the Sidequest worker queue:

- **`publish`** — Triggers CDN asset generation, cache purging, and remote cloud
synchronization.
- **`preview`** — Processes hot-path piece updates from the web editor.
- **`job-progress-purge`** — Cleans up completed database tasks.

It ensures that when SvelteKit pushes a job to the queue, the worker receives it
with matching type verification.

It is not published to npm.
