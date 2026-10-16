---
"@luzzle/web": patch
"@luzzle/web.worker": patch
---

Add a Published piece viewer and align Preview with shared Overview and composition-only Share views, including inline output inspection. Replace legacy Live/OG navigation with View → Published / Preview and Share.

Record successful per-piece publication times, sync saved Markdown to its index, and compare indexed and published hashes.

Restrict public and Preview asset file access to validated directories, including resolved symlink targets.
