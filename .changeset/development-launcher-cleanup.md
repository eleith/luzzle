---
"@luzzle/web": patch
---

Simplify the development launcher and remove its unused production build-at-startup path and obsolete piece-type environment-file script. Production continues to start prebuilt output through its existing launcher. Consolidate overlapping launcher tests while retaining origin validation, startup ordering, and configuration replacement coverage.
