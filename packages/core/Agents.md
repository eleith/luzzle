# Agents.md for @luzzle/core

Instructions for agents working on the `@luzzle/core` package.

## Scope

`@luzzle/core` implements the Luzzle specification. It manages file parsing,
validation, and database synchronization.

## Specifications

* **Schemas:** JSON schemas in `.luzzle/schemas` define record structure.
* **Assets:** Attachments stored in `.assets`.
* **Pieces:** Markdown files (`name.piece-type.md`) representing records.
* **Naming:** `piece-type` corresponds to a schema (e.g., `book` -> `book.json`).

## Architecture

A TypeScript library for database interaction and content manipulation.

* **Database (`src/database`):** `better-sqlite3` and `kysely`. Derivative of
  the file system.
* **Validation (`src/lib/ajv.ts`):** Validates frontmatter against schemas.
* **Content (`src/lib`):** Utilities for parsing Markdown (`remark`) and
  frontmatter.

## Key Concepts

* **Piece:** Logic for handling records resides in `src/pieces`.
* **Database as Cache:** Mirrors Markdown state for efficient querying.
* **Migrations:** Managed in `src/database/migrations.sh`.

## Development

* **Test:** `npm test`
* **Lint:** `npm run lint`
* **Build:** `npm run build`