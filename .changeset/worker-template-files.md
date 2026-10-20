---
"@luzzle/web.worker": patch
---

Write template bundles as one importable templates.mjs containing the renderer
and its template lookup. Complete a staging directory before moving it into place,
preserving existing nonempty bundle directories and handling failed-write cleanup.
Generate the lookup export during bundling to avoid template identifier clashes.
Revision activation, worker jobs, and web integration remain unchanged.
