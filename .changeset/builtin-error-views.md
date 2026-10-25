---
"@luzzle/web": patch
---

Use built-in error views while custom error pages are deferred. Remove legacy
Svelte error-view selection and pass only status/message props to stock views.
