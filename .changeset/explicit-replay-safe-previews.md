---
"@luzzle/web": patch
---

Start previews through an explicit POST action instead of page loading or link preloading. Merge replayed preview logs by identity and show the latest attempt of each phase so working previews do not fail with duplicate rendering keys.
