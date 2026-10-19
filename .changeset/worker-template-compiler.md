---
"@luzzle/web.worker": patch
---

Add worker-owned compilation of Svelte templates into standalone server-rendering
modules. The worker bundles the matching Svelte runtime with esbuild; no template
job, publishing lifecycle, or live web integration is enabled by this change.
