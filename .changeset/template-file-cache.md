---
'@luzzle/web': patch
---

Add a server-side file cache for trusted Svelte templates. Concurrent loads of the same file share one compilation, and callers can opt to reload edited templates.
