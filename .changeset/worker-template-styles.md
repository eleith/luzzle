---
"@luzzle/web.worker": patch
---

Generate site and editor theme CSS with the existing theme package when building
a template bundle. Write theme.css alongside templates.mjs before making the
bundle directory visible, so failed CSS writes cannot expose a partial bundle.
Revision activation, static-asset copying, and web integration remain unchanged.
