---
"@luzzle/web.worker": patch
---

Propagate transform and image-preparation errors instead of treating them as successful empty output. Wait for image variant writes to settle before reporting failure, skip asset-record persistence when production fails, collect failed-piece details and continue processing healthy pieces. Previously written files and metadata are not rolled back.
