---
"@luzzle/web": patch
"@luzzle/web.worker": patch
---

Upgrade OpenWorkflow to 0.11.0 across web, worker and shared jobs. Use its native
logger option and close worker-owned resources in order. Stop deleting engine job
history; preview files and application logs remain application-owned cleanup.
