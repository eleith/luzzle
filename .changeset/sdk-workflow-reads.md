---
"@luzzle/web": patch
---

Use OpenWorkflow SDK APIs for workflow metadata reads in publish/preview pages, dashboard, connectivity checks and progress streams. Preserve existing payload shapes and step-attempt ordering, remove the unused numeric job-ID lookup and the web's raw queue connection, and keep retention cleanup SQL unchanged because the SDK has no purge API.
