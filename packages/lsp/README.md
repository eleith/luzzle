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
cd packages/lsp
npm install
npm run build
```

Then either `npm link` the package or add the `dist/` output to your `$PATH`
so `luzzle-lsp` is available as a command.

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

### nvim-lspconfig (Neovim < 0.11)

```lua
local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

if not configs.luzzle_lsp then
  configs.luzzle_lsp = {
    default_config = {
      cmd = { 'luzzle-lsp', '--stdio' },
      filetypes = { 'markdown' },
      root_dir = lspconfig.util.root_pattern('.luzzle'),
      single_file_support = false,
    },
  }
end

lspconfig.marksman.setup({})
lspconfig.luzzle_lsp.setup({})
```

The `.luzzle` root marker ensures the server only activates inside Luzzle
archives — markdown files outside an archive won't trigger schema validation.

## Schema Discovery 🧩

The proxy reads JSON schemas from `.luzzle/schemas/` in your archive root.
Each schema file maps to a piece type:

- `.luzzle/schemas/books.json` → validates `*.books.md`
- `.luzzle/schemas/films.json` → validates `*.films.md`

Schemas are automatically transformed for compatibility with
`yaml-language-server` (e.g., `nullable: true` is converted to JSON Schema
Draft 7 type unions).

## Debugging 🔍

Enable debug logging to stderr:

```bash
LUZZLE_LSP_DEBUG=1 luzzle-lsp --stdio
```

## CLI 💻

```
luzzle-lsp --stdio     Start the proxy (default)
luzzle-lsp --version   Print version
luzzle-lsp --help      Print usage
```
