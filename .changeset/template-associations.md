---
"@luzzle/web": patch
"@luzzle/web.worker": patch
---

Add independently owned default template contracts for icons, pages and Open Graph,
with a poster-style default icon. Compose template-aware validation outside config;
unspecified associations use `default`, while unknown names or fields fail.

Add bounded metadata-to-field mappings using core selectors. Generate the editor
schema during the templates package build. Rendering follows in a separate change.
