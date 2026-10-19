---
"@luzzle/web.worker": patch
---

Prefer the worker's declared minimum Node version for compiled templates, with
Node 24 as the fallback when it cannot be interpreted. Keep production output
fixed and verify the web and worker runtime minimums remain aligned.
