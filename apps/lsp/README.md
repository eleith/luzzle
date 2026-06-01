# @luzzle/lsp 🧠

An LSP proxy that brings schema-aware validation, autocompletion, and
diagnostics to the YAML frontmatter inside your Luzzle Markdown files.

## How It Works 🏗️

The proxy sits between your editor and `yaml-language-server`. It intercepts
documents, masks the Markdown body with whitespace (preserving coordinate
systems 1:1), rewrites the language context to YAML, and injects your archive's
JSON schemas. The result is full schema validation and completion inside your
frontmatter, with zero noise from the Markdown body.

---

## Prerequisites 📦

- **Node.js** >= 24
- **yaml-language-server** — install via Mason (`:MasonInstall
yaml-language-server`) or npm (`npm i -g yaml-language-server`)
- **marksman** (recommended) — handles standard Markdown features like links and
  headings alongside this proxy.

---

## Installation 🚀

```bash
npm install -g @luzzle/lsp
```

While the proxy works with any editor supporting the Language Server Protocol
(LSP), we have native integration setup examples for Neovim.

---

## Editor Configuration ⚙️

### Neovim Setup (Neovim 0.11+)

Add the following configuration to your LSP plugin or config files:

```lua
vim.lsp.config('luzzle_lsp', {
  cmd = { 'luzzle-lsp', '--stdio' },
  filetypes = { 'markdown' },
  root_markers = { '.luzzle' },
})

vim.lsp.enable({ 'marksman', 'luzzle_lsp' })
```

The `.luzzle` root marker ensures the server only activates inside Luzzle
archives—standard Markdown files outside your garden won't trigger schema
validation.

---

## Schema Discovery 🧩

The proxy automatically reads JSON schemas from `.luzzle/schemas/` in your
archive root. Each schema file maps to a piece type:

- `.luzzle/schemas/books.json` → validates `*.books.md`
- `.luzzle/schemas/films.json` → validates `*.films.md`

---

## CLI & Debugging 🔍

Run the proxy manually or enable debugging to stderr:

```bash
LUZZLE_LSP_DEBUG=1 luzzle-lsp --stdio
```

Other CLI arguments:

```bash
luzzle-lsp --stdio     Start the proxy (default)
luzzle-lsp --version   Print version
luzzle-lsp --help      Print usage
```
