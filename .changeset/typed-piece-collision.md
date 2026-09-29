---
'@luzzle/core': patch
---

Mark piece filename collisions with the standard `EEXIST` error code so callers can retry without parsing an error message.
