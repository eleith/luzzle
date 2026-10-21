---
"@luzzle/web": patch
"@luzzle/web.worker": patch
---

Supply components.PieceIcon inside prepared page and Open Graph templates.
Configured/default icons render as actual components in the same Svelte SSR
graph, with normal CSS collection, context and head ordering. No application
component constructor crosses the bundle boundary, and the public module's
renderer/lookup/body/head contract is unchanged.

Share one canonical icon.default.svelte source with the legacy app adapter through
the templates package's components asset family. Production route cutover and browser
interaction acceptance remain separate work.
