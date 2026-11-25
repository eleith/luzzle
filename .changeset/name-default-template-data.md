---
'@luzzle/web': patch
'@luzzle/web.worker': patch
---

Clarify that the piece template mappers supply fields for the generic defaults, not the authored designs. The worker reads the default Open Graph fields directly; the public `piece.templates` response is unchanged.
