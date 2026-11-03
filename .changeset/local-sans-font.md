---
"@luzzle/web": patch
"@luzzle/web.worker": patch
"@luzzle/web.proxy": patch
"@luzzle/web.config": patch
"@luzzle/web.theme": patch
---

Support local WOFF2 via `content.fonts.sans` for browser text and worker OG images. Serve configured images and fonts at `/assets/{role}/{filename}` using URL-encoded basenames and revalidation. Reread files on use; only config changes need a restart. Preserve bundled defaults when omitted.
