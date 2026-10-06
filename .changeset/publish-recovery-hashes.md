---
"@luzzle/web": patch
"@luzzle/web.worker": patch
---

Track successfully published Markdown content hashes so Check and Publish can find unfinished pieces after indexing has already advanced. Record success only after asset, CDN, and cache phases finish, leaving failed pieces pending for a later publish. Initialize existing web rows from their indexed hashes during migration. Deploy after existing publish jobs have finished; older interrupted jobs must not resume across this upgrade.
