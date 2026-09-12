---
"@luzzle/web.worker": patch
---

Resume job_progress_logs line numbering from the last persisted line instead of always restarting at 0, fixing a UNIQUE constraint failure when a durable workflow step retries or resumes the same phase.
