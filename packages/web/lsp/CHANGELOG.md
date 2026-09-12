# @luzzle/web.lsp

## 0.0.240

### Patch Changes

- 643f5ce: Fix yaml-language-server failing to start in the web.lsp image ("Cannot find module '.../yaml-language-server/bin/yaml-language-server'"). The pnpm .bin shim resolves its target relative to $0, which shells don't dereference through a symlink; add the shim's real directory to PATH instead of symlinking it into /usr/local/bin.

## 0.0.239

### Patch Changes

- cedb7d1: Build @luzzle/lsp and yaml-language-server from workspace source in the production image instead of a stale global npm install, fixing frontmatter autocomplete not working in production. yaml-language-server is now a pinned dependency of @luzzle/lsp instead of an unpinned global install.

## 0.0.238

### Patch Changes

- Include @luzzle/web.proxy and @luzzle/web.lsp in the synchronized release group.
