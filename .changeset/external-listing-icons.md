---
'@luzzle/web': patch
---

Support trusted local Svelte files in `pieces[].templates.icon.file` for public type listings. Other surfaces keep using the selected built-in icon (or `default`). The books demo uses the bundled example; remove its `file` setting to restore the built-in book design.
