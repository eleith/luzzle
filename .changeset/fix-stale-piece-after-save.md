---
"@luzzle/web": patch
---

Fix an intermittent bug where saving a newly generated/created piece and being redirected back to its source editor could show stale pre-save content (edits appeared lost, though they were saved correctly). Caused by SvelteKit reusing a hover-preloaded page fetched before the save completed; `invalidateAll()` is now called before navigating away on save.
