# @luzzle/web.worker 👷

The sidecar background worker service for the Luzzle web ecosystem. The worker
pulls asynchronous job payloads off a shared SQLite queue (powered by OpenWorkflow)
and processes resource-heavy tasks off the main web thread.

## Why it exists 🤖

The worker isolates intensive CPU/IO tasks from the SvelteKit app, including:

- Cloud storage synchronization (powered by `rclone`).
- Bulk Markdown-to-SQLite database parsing and syncing.
- Asset transformations
  - generating image variants using `sharp`
  - generating color palettes using `colorlip`
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
3. **`job-progress-purge`** — Clean-up job to purge completed/failed workflow
   job logs based on a retention schedule.

---

## Template compiler

`src/templates/compile.ts` contains a low-level `compileTemplates(templates)`
function. Each name maps to `{ source, filename }`. It compiles all sources with
Svelte and bundles them together with esbuild into one standalone Node ESM module,
returned as `code` alongside source `warnings`.

```ts
const compiled = await compileTemplates({
	page: { source: pageSource, filename: 'page.svelte' },
	icon: { source: iconSource, filename: 'icon.svelte' },
})
```

The generated module exports `render(name, props)`, which synchronously returns
plain `{ body, head }` strings. `head` includes only the selected render's component
CSS. All templates share one Svelte server runtime; callers do not need to install
Svelte. Unknown names throw an error, not a fallback. Names are identifiers, not
filesystem paths or a piece-type allowlist. Diagnostics retain source filenames.
The names and sources are caller-supplied; this utility does not discover them.

This utility does not read configuration, validate the supported authoring subset,
cache/publish revisions, or register a background job. Open Graph and thumbnail
processing are unchanged. Template source is trusted site-owner code, not sandboxed.

## Operations 🛠️

The worker executes inside the `luzzle-worker` Docker container. For
comprehensive configuration options and deployment parameters, see the [Web
Stack Deployment Guide](../docs/deployment.md).
