# @luzzle/lsp 🧠

An LSP proxy that brings schema-aware validation, autocompletion, and
diagnostics to the YAML frontmatter inside your Luzzle Markdown files.

## How It Works 🏗️

The proxy sits between your editor and `yaml-language-server`. It intercepts
documents, masks the Markdown body with whitespace (preserving coordinates 1:1),
rewrites the language to YAML, and injects your archive's JSON schemas. The
result: full schema validation and completions in your frontmatter, zero noise
from the Markdown body.

## Prerequisites 📦

- **Node.js** >= 20
- **yaml-language-server** — install via Mason (`:MasonInstall
  yaml-language-server`) or npm (`npm i -g yaml-language-server`)
- **marksman** (recommended) — handles Markdown features like links and
  headings alongside this proxy

## Install 🚀

```bash
npm install @luzzle/lsp
```

## Neovim Setup ⚙️

Add the following to your LSP config (e.g., `plugins/lsp.lua` or wherever you
configure your language servers).

### Neovim 0.11+ (Native LSP)

```lua
vim.lsp.config('luzzle_lsp', {
  cmd = { 'luzzle-lsp', '--stdio' },
  filetypes = { 'markdown' },
  root_markers = { '.luzzle' },
})

vim.lsp.enable({ 'marksman', 'luzzle_lsp' })
```

The `.luzzle` root marker ensures the server only activates inside Luzzle
archives — markdown files outside an archive won't trigger schema validation.

## Schema Discovery 🧩

The proxy reads JSON schemas from `.luzzle/schemas/` in your archive root.
Each schema file maps to a piece type:

- `.luzzle/schemas/books.json` → validates `*.books.md`
- `.luzzle/schemas/films.json` → validates `*.films.md`

## Debugging 🔍

Enable debug logging to stderr:

```bash
LUZZLE_LSP_DEBUG=1 luzzle-lsp --stdio
```

## CLI 💻

```bash
luzzle-lsp --stdio     Start the proxy (default)
luzzle-lsp --version   Print version
luzzle-lsp --help      Print usage
```
