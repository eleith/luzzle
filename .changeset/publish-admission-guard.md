---
"@luzzle/web": patch
---

Upgrade OpenWorkflow to 0.9.2 and serialize publish and audit check-and-enqueue requests within one web process. Check the latest five runs per workflow through the SDK, retain active-run conflict responses and audit checks, and release admission on enqueue failure. Older active runs outside that window are not detected.
