# Editor support

Schema completions and diagnostics for Markdown frontmatter. Keep your usual
Markdown language server for links and headings; Luzzle handles the YAML bit.

## Install

Use Node.js 24 or newer:

```sh
npm install -g @luzzle/lsp yaml-language-server
```

Both executables must be on your editor's `PATH`. You need an
[archive with schemas](archive.md), not a web app or SQLite index.

## Neovim 0.11+

```lua
vim.lsp.config('luzzle_lsp', {
  cmd = { 'luzzle-lsp', '--stdio' },
  filetypes = { 'markdown' },
  root_markers = { '.luzzle' },
})
vim.lsp.enable('luzzle_lsp')
```

Other editors should start `luzzle-lsp --stdio` for Markdown and use the archive
folder as the workspace root. The CLI config is not used here.

## No squiggles?

Check that `.luzzle/schemas/notes.json` matches `*.notes.md`, and that frontmatter
starts on the first line between two `---` lines. Restart the language server
after adding or renaming schemas.

If it will not start, check Node and the editor's `PATH`, especially for
`yaml-language-server`. For debug output, set `LUZZLE_DEV=true` in the language
server's environment and check the editor's LSP log.

For a second opinion outside the editor, use [CLI validation](cli.md#a-first-run).
