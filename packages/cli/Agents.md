# Agents.md for @luzzle/cli

Instructions for agents working on the `@luzzle/cli` package.

## Scope

The CLI allows users to manage their Luzzle archive from the terminal. It handles
piece creation, asset management, and validation.

## Specifications

* **File Naming:** Pieces must follow `name.piece-type.md`.
* **Assets:** Attachments are stored in `.assets`.
* **Validation:** Frontmatter must conform to `.luzzle/schemas`.

## Architecture

* **Commands (`src/commands`):** Command domain logic using `yargs`.
* **Logic:** Uses `@luzzle/core` for operations (edit, delete, create, sync).

## Development

* **Test:** `npm test`
* **Lint:** `npm run lint`
* **Build:** `npm run build`
