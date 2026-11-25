---
'@luzzle/web.worker': patch
---

Remove the unused single-transform filter from the publication runner. Publishing continues to run transforms in order and passes each transform’s outputs to the next.
