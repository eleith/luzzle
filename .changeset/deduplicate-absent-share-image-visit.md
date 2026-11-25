---
'@luzzle/web': patch
---

Remove a duplicate browser visit for a Share card without a recorded PNG. Browser tests still distinguish an absent image from a recorded image that fails to load.
