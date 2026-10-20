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
Svelte files and compiles them into one standalone Node ESM module. It also builds
site and editor theme CSS using the existing `@luzzle/web.theme` generators.

```ts
const bundle = await buildTemplateBundle(config)
// bundle.moduleCode: generated JavaScript exporting render and templateLookup
// bundle.templateLookup.pieces[type].page: the compiled name for that role
// bundle.templateLookup.site.root: the compiled name for that site slot
// bundle.themeCss: generated site and editor theme CSS
// bundle.warnings: source compiler diagnostics
```

Templates follow Svelte's server-rendering behavior. This build does not generate
a client bundle or hydrate authored components, so Svelte event handlers and
browser-only hooks do not become interactive. Browser behavior must come from
native HTML/CSS or be supplied by the web application.

There is no Tailwind/Sass preprocessing step here. Such source styles need separate
preprocessing; already generated CSS is ordinary CSS. These are toolchain
capabilities, not additional syntax restrictions.

The lookup is worker-local selection data, not a versioned manifest. It contains
no source paths or source text. Shared files compile once and reuse one name.
Conflicting sources for the same piece type and role throw an error.

`writeTemplateBundle(bundle, outputDirectory)` in `src/templates/write.ts` writes
`templates.mjs` exporting both `render` and `templateLookup`, alongside `theme.css`.
It returns the module's absolute filename. Use a fresh output directory. It finishes
both files in a sibling staging directory before renaming that directory into
place; existing nonempty bundle directories remain untouched. Failed writes clean up staging files; if cleanup
also fails, an `AggregateError` retains both errors and the original cause.

This low-level writer does not select a revision, refresh Node's module cache, or
copy static assets. The caller chooses the output directory.

`publishTemplateBundle(config, preparedDirectory)` in `src/templates/publish.ts`
builds and writes a new `revisions/<id>/` directory, then atomically replaces
`current.json` with `{ "revision": "<id>" }`. It returns `{ revision, warnings }`;
source diagnostics are not stored in the selector. Readers should capture that ID
once and use its renderer and CSS together. Older revision directories are retained.

Each call builds a fresh revision. Concurrent calls select by the last successful
selector rename, not request start order. Failed builds/writes leave the previous
selection untouched; a failed selector update can leave a completed but unselected
revision. Temporary selector files are cleaned up when possible, preserving primary
and cleanup errors. Retention and unchanged-input detection are separate work.
Atomic visibility assumes normal local-filesystem rename behavior, not crash durability.

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

Source-reading, compiler, bundler, theme-generation and publication errors
propagate to the caller; failed publication preserves the previous selection.
Module-loading and rendering errors also reach their caller. These utilities do
not yet implement web fallback or activation, copy static assets, refresh Node's
module cache, or register a background job. Templates are trusted site-owner code,
not sandboxed. Open Graph and thumbnail processing are unchanged.

## Operations 🛠️

The worker executes inside the `luzzle-worker` Docker container. For
comprehensive configuration options and deployment parameters, see the [Web
Stack Deployment Guide](../docs/deployment.md).
