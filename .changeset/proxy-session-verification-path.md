---
"@luzzle/web": patch
"@luzzle/web.proxy": patch
---

Move proxy session verification to `/api/session/verify` and update LSP
authorization to use it, freeing `/api/auth` for Better Auth. Deploy the matching
web and proxy versions together.
