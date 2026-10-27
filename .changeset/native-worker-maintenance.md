---
"@luzzle/web.worker": patch
---

Schedule preview-data cleanup with OpenWorkflow cron and durable jitter near
02:00 UTC instead of a startup run and process-local timer. Remove expired preview
files before their application progress/log rows, retain active jobs and engine
history, and remove the unused duplicate cleanup step.
