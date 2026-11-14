---
"@luzzle/web": patch
---

Stop loading application YAML and secrets during Vite/Svelte configuration discovery. Preserve configured Docker development networking through the existing startup manager, without changing production startup.
