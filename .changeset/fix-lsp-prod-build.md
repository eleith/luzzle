---
"@luzzle/lsp": patch
"@luzzle/web.lsp": patch
---

Build @luzzle/lsp and yaml-language-server from workspace source in the production image instead of a stale global npm install, fixing frontmatter autocomplete not working in production. yaml-language-server is now a pinned dependency of @luzzle/lsp instead of an unpinned global install.
