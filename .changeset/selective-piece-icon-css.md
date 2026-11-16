---
"@luzzle/web": patch
---

Load only the required icon styles on individual public piece pages through native component dependency splitting. Small styles remain automatically inlined by SvelteKit, while mixed listings continue to use the full icon catalog.
