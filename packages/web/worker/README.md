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

## Template bundles

`buildTemplateBundle(config)` in `src/templates/bundle.ts` reads the registered
Svelte files and compiles them into one standalone Node ESM module.

```ts
const bundle = await buildTemplateBundle(config)
// bundle.moduleCode: generated JavaScript exporting render(name, props)
// bundle.templateLookup.pieces[type].page: the compiled name for that role
// bundle.templateLookup.site.root: the compiled name for that site slot
// bundle.warnings: source compiler diagnostics
```

The lookup is worker-local selection data, not a published revision format. It
contains no source paths or source text. Shared files compile once and reuse one
name. Conflicting sources for the same piece type and role throw an error.

Two internal utilities perform the work:

- `readConfiguredTemplates(config)` in `src/templates/sources.ts` reads the files
  registered in an existing `Config`, resolving paths relative to `paths.config`.
  It retains each piece-role/site-slot association, with no piece-type allowlist
  or required template directory.
- `compileTemplateBundle(sources)` in `src/templates/compile.ts` takes names mapped
  to `{ source, filename }` and returns `{ moduleCode, warnings }`. Svelte compiles
  the sources; esbuild bundles them with one shared Svelte server runtime.

The generated `render(name, props)` synchronously returns plain `{ body, head }`
strings, including the selected template's CSS. Callers do not need to install
Svelte. Unknown names throw; diagnostics retain source filenames.

These utilities do not validate the supported authoring subset, cache/publish
revisions, or register a background job. Open Graph and thumbnail processing are
unchanged. Template source is trusted site-owner code, not sandboxed.

## Operations 🛠️

The worker executes inside the `luzzle-worker` Docker container. For
comprehensive configuration options and deployment parameters, see the [Web
Stack Deployment Guide](../docs/deployment.md).
