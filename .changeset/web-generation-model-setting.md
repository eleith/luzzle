---
"@luzzle/web": patch
---

Allow an optional server-side ai.model setting for metadata and body generation. Omitted or blank values use core's shared default, and model changes require only a web restart. Keep model selection out of browser requests and public configuration.
