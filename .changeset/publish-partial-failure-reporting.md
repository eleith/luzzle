---
"@luzzle/web": patch
"@luzzle/web.worker": patch
---

Include failed-piece details in publish results while continuing healthy work and CDN/cache phases. Report completed batches with asset failures as partial in progress streams and show an explicit error summary instead of Published successfully, including on reload. Preserve ordinary success and legacy outcomes; encode piece links correctly.
