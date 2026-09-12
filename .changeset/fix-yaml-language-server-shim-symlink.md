---
"@luzzle/lsp": patch
"@luzzle/web.lsp": patch
---

Fix yaml-language-server failing to start in the web.lsp image ("Cannot find module '.../yaml-language-server/bin/yaml-language-server'"). The pnpm .bin shim resolves its target relative to $0, which shells don't dereference through a symlink; add the shim's real directory to PATH instead of symlinking it into /usr/local/bin.
