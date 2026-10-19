---
"@luzzle/web.worker": patch
---

Compile a named set of server templates into one standalone module sharing a
single Svelte runtime. The renderer selects a template by name, keeps output
isolated between calls, and retains source diagnostics. Configuration discovery,
revision publication and live web integration remain unchanged.
