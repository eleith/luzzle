# @luzzle/web.lsp

## 0.0.245

### Patch Changes

- 3dbf10c: Align development and CI on Node 26, pnpm 11.2.2, TypeScript 6 and Vitest 4.
  Keep web, worker and template Svelte versions aligned at 5.57.3. Preserve the
  LSP executable's `dist/index.js` layout and exclude CLI test mocks from production
  builds. Include untested production files in coverage without lowering thresholds.
  CLI command behavior, core APIs and the archive format are unchanged.
- 8ec14ec: Ship a prebuilt, author-independent web image that reads YAML at startup without
  rebuilding the application. Discover piece types at runtime, keep framework
  JavaScript/CSS same-origin, and apply configured asset prefixes to CSP without
  relaxing native CSRF checks. Development images need no host npm credentials;
  configuration-directory mounts support atomic saves without adding hot reload.

  **Upgrade:** use the published-image Compose/config examples and deploy the web
  stack together. `url.app_assets` affects app-owned static files, not framework
  chunks. Rebuild/recreate existing checkout-based containers for the new image
  and config-directory layout; config changes thereafter require restart, not an
  app build. Back up archive/data and let active jobs finish before upgrading.

## 0.0.244

## 0.0.243

## 0.0.242

## 0.0.241

## 0.0.240

### Patch Changes

- 643f5ce: Fix yaml-language-server failing to start in the web.lsp image ("Cannot find module '.../yaml-language-server/bin/yaml-language-server'"). The pnpm .bin shim resolves its target relative to $0, which shells don't dereference through a symlink; add the shim's real directory to PATH instead of symlinking it into /usr/local/bin.

## 0.0.239

### Patch Changes

- cedb7d1: Build @luzzle/lsp and yaml-language-server from workspace source in the production image instead of a stale global npm install, fixing frontmatter autocomplete not working in production. yaml-language-server is now a pinned dependency of @luzzle/lsp instead of an unpinned global install.

## 0.0.238

### Patch Changes

- Include @luzzle/web.proxy and @luzzle/web.lsp in the synchronized release group.
