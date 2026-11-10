---
"@luzzle/web.worker": patch
---

Use Sharp's palette quantizer instead of Colorlip to extract image swatches. Build piece palettes from those swatches, favoring colorful backgrounds and choosing black or white text with measured contrast against the solid background. Share the same straightforward pipeline between Preview and Publish.
