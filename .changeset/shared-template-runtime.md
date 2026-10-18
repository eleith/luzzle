---
"@luzzle/web": patch
"@luzzle/web.worker": patch
---

Include the internal, release-built template SSR runtime in web and worker
packages. Keep that runtime external to Vite so prepared templates and their
adapters share one server-rendering context. Live template selection and worker
preparation are not enabled by this foundation change.
