---
'@luzzle/web.worker': patch
---

Upgrade Takumi to 2.22.1 for Open Graph PNG rendering. Pass local piece images through its new image-source API so book covers render without removing meaningful spaces from authored cards. Regenerating a PNG can change its layout and typography.
