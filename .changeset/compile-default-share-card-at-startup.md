---
'@luzzle/web.worker': patch
---

Compile the default Open Graph card in memory at worker startup instead of writing executable modules to disk. Templates compose their own bylines, and operator-authored cards still load from mounted Svelte files without a build step.
