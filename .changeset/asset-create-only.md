---
"@luzzle/core": patch
---

Prevent concurrent asset uploads from overwriting each other. If another upload creates the chosen filename first, fail safely instead of replacing that asset.
