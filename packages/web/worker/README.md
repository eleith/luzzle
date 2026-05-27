# @luzzle/web.worker 👷

The sidecar background worker service for the Luzzle web ecosystem. The worker
pulls asynchronous job payloads off a shared SQLite queue (powered by Sidequest)
and processes resource-heavy tasks off the main web thread.

## Why it exists 🤖

The worker isolates intensive CPU/IO tasks from the SvelteKit app, including:

- Cloud storage synchronization (powered by `rclone`).
- Bulk Markdown-to-SQLite database parsing and syncing.
- Asset transformations
  - generating image variants using `sharp`
  - generating color palettes using `node-vibrant`
  - generating opengraph images using `takumi`
- CDN asset uploads (powered by `rclone`)
- Piece transformations
  - syntax highlighting using `shiki`
  - markdown to html using `remark`

---

## Active Background Jobs ⚙️

The worker registers and processes the following job types:

1. **`publish`** — Triggers the orchestrator pipeline to synchronize the archive
 from/to remotes, parse changes, build CDN asset variants, and sync CDN.
2. **`preview`** — Performs hot-path parsing of piece modifications in the
 editor, returning on-the-fly syntax-highlighted HTML and asset preview URLs.
3. **`job-progress-purge`** — Clean-up job to purge completed/failed Sidequest
 job logs based on a retention schedule.

---

## Operations 🛠️

The worker executes inside the `luzzle-worker` Docker container. For
comprehensive configuration options and deployment parameters, see the [Web
Stack Deployment Guide](../docs/deployment.md).
