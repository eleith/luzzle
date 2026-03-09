# Agents.md for @luzzle/lsp 🗣️

## Scope
Language Server Protocol (LSP) proxy that enables IDE integrations (like Neovim) by acting as a middleman to the standard `yaml-language-server`. It masks markdown bodies and maps Luzzle JSON schemas so standard tools can understand Luzzle Markdown pieces.

## Architecture
* **RPC Layer**: Uses `vscode-jsonrpc` to intercept and manipulate standard LSP requests/responses.
* **Handlers**: Interception logic in `src/handlers.ts`.
* **Masking**: Replaces markdown bodies (everything after the frontmatter `...` closing delimiter) with empty spaces to prevent the YAML parser from choking in `src/masking.ts`.
* **Schemas**: Transforms strict JSON schemas from `.luzzle/schemas` to be compatible with YAML schemas (e.g. converting `nullable: true` to type unions) in `src/schemas.ts`.

## Quality
* Maintain coverage standards (100%) as currently tested with `vitest`.
* Keep the implementation as lightweight as possible as it sits in the hot path between the IDE and the language server.