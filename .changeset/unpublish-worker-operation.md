---
"@luzzle/web.jobs": patch
"@luzzle/web.worker": patch
---

Add a one-attempt Unpublish worker operation that withdraws the public record and
removes its recorded, unshared generated files. Preserve archive originals and
report cleanup failures without automatic recovery. Reuse shared rclone remote
configuration and generated-file validation helpers.
