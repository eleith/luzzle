---
'@luzzle/core': patch
'@luzzle/cli': patch
---

Avoid logging full asset download URLs or upstream error messages in core and CLI diagnostics. Log the source origin instead.
