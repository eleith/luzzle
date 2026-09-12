# @luzzle/web.lsp

## 0.0.239

### Patch Changes

- cedb7d1: Build @luzzle/lsp and yaml-language-server from workspace source in the production image instead of a stale global npm install, fixing frontmatter autocomplete not working in production. yaml-language-server is now a pinned dependency of @luzzle/lsp instead of an unpinned global install.

## 0.0.238

### Patch Changes

- Include @luzzle/web.proxy and @luzzle/web.lsp in the synchronized release group.
