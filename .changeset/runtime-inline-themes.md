---
"@luzzle/web": patch
---

Generate configured theme and editor CSS once at server startup and inline it
where layouts request it, without sending CSS through hydration data. Keep fixed
reset, base and Markdown styles as ordinary SvelteKit-managed imports.
