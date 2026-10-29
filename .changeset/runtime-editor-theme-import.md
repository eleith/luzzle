---
"@luzzle/web.theme": patch
---

Load configured editor palettes through Shiki's native lazy theme registry.
Retain all themes as runtime dependencies while importing only the configured
light/dark pair on the server and sending their generated CSS to the browser.
