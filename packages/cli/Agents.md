# Agents.md for @luzzle/cli

This document provides guidance for developers and AI assistants working on the
@luzzle/cli package.

## Guiding Principles

The `@luzzle/cli` package enables users to manage their Luzzle archive directly
from the terminal. It allows for the creation and management of pieces (Markdown
files) and their assets, ensuring they adhere to internal schemas.

### Adherence to Specification

while a user could manage a luzzle archive manually with a text editor and any
file manager, using the cli can help with a few specifications that are
required:

* **File Naming:** all pieces must meet the `name.piece-type.md` convention
* **Assets:** all attachments are stored in the `.assets` directory
* **Validation:** all frontmatter in pieces conform to the piece schemas defined
in `.luzzle/schemas`.

## Architecture

The CLI is built using `yargs` for command parsing.

* **Commands (`src/commands`):** Each subdirectory represents a command domain
    (e.g., `piece`, `type`).
* **Logic:** Leverages `@luzzle/core` for all luzzle operations (editing,
deleting, creating, syncing to sqlite for cacheing)

## Key Concepts

* **Piece Management:** Commands to create (`luzzle piece add`), edit, and
    validate pieces.
* **Asset Management:** Handling attachments and linking them to pieces in the
    `.assets` folder.
* **Schema Management:** Commands to manage the JSON schemas in the `.luzzle`
    folder

## Development

* **Test:** `npm test`
* **Lint:** `npm run lint`
* **Build:** `npm run build`
