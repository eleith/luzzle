# Agents.md for @luzzle/core

This document provides guidance for developers and AI assistants working on the
@luzzle/core package.

## Guiding Principles

The `@luzzle/core` package is the foundational layer of the Luzzle ecosystem. It
provides all the necessary tools and functionalities to interact with the Luzzle
database and manage Luzzle "pieces" (records). The primary goal of this package
is to provide a stable, reliable, and easy-to-use API for other packages in the
monorepo.

## Architecture

This package is a TypeScript library that provides a comprehensive set of tools
for database interaction, data validation, and content manipulation.

*   **Database:** It uses a SQLite database, with Kysely as the query builder.
    The main database client can be accessed through `getDatabaseClient` in
    `src/database/client.ts`. The database schema is defined in
    `src/database/tables`.
*   **Data Validation:** JSON schema validation is handled by Ajv, with custom
    formats defined in `src/lib/ajv.ts`. This is primarily used for validating
    the frontmatter of markdown files.
*   **Content:** The package provides utilities for handling markdown files and
    their frontmatter. Key logic is in `src/lib/markdown.ts` and
    `src/lib/frontmatter.ts`.

## Key Concepts

*   **Piece:** A "piece" is a single Luzzle record, which is essentially a
    markdown file with associated metadata in its frontmatter. The logic for
    handling pieces is in the `src/pieces` directory.
*   **Kysely:** A type-safe SQL query builder for TypeScript. It's used for all
    database interactions.
*   **Ajv:** A fast JSON schema validator. It's used to validate the
    frontmatter of pieces against a defined schema.

## Development

### Getting Started

1.  Install Node.js (version >=20) and npm.
2.  Install dependencies from the root of the monorepo: `npm install`
3.  Run this package's tests: `npm test -w @luzzle/core`