# @luzzle/core

The core library for Luzzle, creating a bridge between your Markdown files and a
structured database.

## Overview

`@luzzle/core` is the engine room of the Luzzle ecosystem. It handles the heavy
lifting of parsing Markdown files, validating them against your custom JSON
schemas, and synchronizing that data into a SQLite database for high-performance
querying.

## Philosophy

This package strictly adheres to the Luzzle philosophy: **Text is the Source of
Truth.**

While it provides a powerful database client (via Kysely), this database is
treated as a derivative cache. The primary function of this library is to ensure
that your Markdown files remain valid, structured, and accessible.

## Usage

This is primarily a library used by other Luzzle tools (like the CLI or Web
Explorer), but it can be used to build custom nodejs tools for your archive.

```bash
npm install @luzzle/core
```

### Example: Database Access

```typescript
import { getDatabaseClient } from '@luzzle/core/database/client';

const db = getDatabaseClient('/path/to/luzzle/root');
// Execute type-safe queries with Kysely
```

## Key Features

* **Schema Validation:** Enforces structure on your Markdown frontmatter using
    Ajv.
* **File Synchronization:** Reads Markdown files and updates the local SQLite
    database.
* **Type-Safe Querying:** Exports a Kysely client for robust data access.
