---
'@luzzle/web': patch
'@luzzle/web.worker': patch
---

Remove `helpers.getPieceUrl()` from authored templates. The demo article designs display only the mapped source URL, leaving the address field blank when none is supplied. Public piece routes are unchanged.
