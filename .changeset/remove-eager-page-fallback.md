---
"@luzzle/web": patch
---

Remove the legacy public page entrypoint and unused eager template renderers now that configured piece URLs use generated, template-specific server-rendered routes. Preserve metadata and loading behavior, and keep the public edit-source shortcut in application chrome rather than template routing. Unknown or malformed public paths continue to use framework error handling.
