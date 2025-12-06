# Agents.md for @luzzle/core

This document provides guidance for developers and AI assistants working on the
@luzzle/core package.

## Guiding Principles

The `@luzzle/core` package is the foundational layer of the Luzzle ecosystem. It
implements the Luzzle specification, treating Markdown files as the source of
truth while maintaining a high-performance SQLite database as a cache for other
apps to use.

### The Luzzle Specification

A Luzzle archive consists of pieces, schemas, and assets:

* **Schemas:** Stored in `.luzzle/schemas`. These define the JSON schema for
    the frontmatter of each piece type. This is how metadata for records is
    structured.
* **Assets:** Stored in `.assets`. This folder contains all attachments
    (images, archives, etc.) belonging to pieces. Paths to these assets are
    recorded directly in the frontmatter of the piece. Luzzle can manage this to
    for consistent naming conventions or it can just be done manually.
* **Pieces:** A piece is a Markdown file representing a record. It can exist
    in the root or any subdirectory.
* **Naming Convention:** Files must follow the format `name.piece-type.md`
(e.g., `dune.book.md`), where `piece-type` maps to a schema definition store in
`.luzzle/schemas/book.json`

## Architecture

This package is a TypeScript library that provides a comprehensive set of tools
for database interaction, data validation, and markdown/frontmatter content manipulation.

* **Database (`src/database`):** Uses `better-sqlite3` and `kysely`. The
    database is a derivative of the file system.
* **Validation (`src/lib/ajv.ts`):** Uses `ajv` to validate frontmatter
    metadata against JSON schemas defined in the `.luzzle/schemas` folder.
* **Content (`src/lib`):** Utilities for parsing Markdown (`remark`) and
    managing frontmatter (`remark-frontmatter`).

## Key Concepts

* **Piece:** A Luzzle record represented by a Markdown file with frontmatter.
    The logic for handling pieces resides in `src/pieces`.
* **Database as Cache:** The SQLite database mirrors the state of the Markdown
    files to allow for efficient complex queries.
* **Migrations:** Managed in `src/database/migrations.sh`.

## Development

* **Test:** `npm test`
* **Lint:** `npm run lint`
* **Build:** `npm run build`

