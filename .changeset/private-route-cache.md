---
"@luzzle/web": patch
"@luzzle/web.proxy": patch
---

Prevent caching of protected responses, private preview assets, and LSP authentication checks. Make private Nginx locations take precedence over asset-extension caching while retaining public caches.
