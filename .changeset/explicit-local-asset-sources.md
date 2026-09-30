---
'@luzzle/core': minor
'@luzzle/cli': patch
---

Require HTTP(S) URLs for asset source strings while keeping existing `.assets/...` field references unchanged. Local files must now be opened by the caller and passed as streams; CLI attach continues to accept local paths by opening them explicitly.
