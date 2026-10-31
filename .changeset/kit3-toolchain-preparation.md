---
"@luzzle/web": patch
"@luzzle/web.worker": patch
"@luzzle/web.templates": patch
"@luzzle/web.jobs": patch
---

Prepare the shared build and test toolchain for SvelteKit 3 while retaining Kit 2
and the current application behavior. Align the web, worker and template Svelte
compiler/runtime at 5.57.3, preserving native runtime OG compilation and rendering.
Keep workflow-spec declarations portable with the updated TypeScript compiler.
