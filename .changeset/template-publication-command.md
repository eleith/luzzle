---
"@luzzle/web.worker": patch
---

Add an on-demand publish:templates command using the existing template-bundle
publisher, and shared paths.prepared configuration resolved beside the config
file. Missing/invalid configuration or failed preparation exits nonzero without
silently selecting a default-only bundle. Explicit config filenames now require
an existing readable file; loadConfig() without a filename still returns defaults.

Exercise the built command in native tests and the built SvelteKit SSR fixture.
Automatic preparation hooks and production page cutover remain separate work.
