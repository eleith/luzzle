---
'@luzzle/web.worker': patch
---

Read the three packaged Open Graph stylesheets once per worker process instead of once per PNG. Fonts and piece images are still read on each render.
