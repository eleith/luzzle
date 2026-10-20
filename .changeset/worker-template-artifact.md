---
"@luzzle/web.worker": patch
---

Add buildTemplateBundle(config) to read configured templates and produce one
standalone renderer with a worker-local template lookup. Clarify the reader and
compiler names and return generated JavaScript as moduleCode. Preserve source
diagnostics and reject conflicting role registrations. No revision publication,
worker job, or web integration is enabled.
