---
"@luzzle/web.worker": patch
---

Reduce generated Open Graph PNG sizes using the existing Sharp dependency's palette encoder. Keep the original whenever encoding would not reduce file size, and preserve image paths and MIME types. Palette encoding trades some color fidelity for smaller previews.
