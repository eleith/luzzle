---
"@luzzle/web": patch
---

Read configured piece types from server configuration and expose their names through
layout data for reactive search choices. Replace the remaining configuration-bound
route matchers with server-side type checks without changing URLs or feed formats.

Remove the Vite piece-type constant. Configuration remains cached until server
restart; no automatic config reload, new environment setting, or template-consumer
cutover is introduced.
