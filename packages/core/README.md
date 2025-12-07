# @luzzle/core

The engine room of Luzzle. 🚂

## Overview

`@luzzle/core` bridges the gap between your text files and a structured database.
It handles the heavy lifting of parsing Markdown, validating schemas, and
syncing everything to SQLite.

## Philosophy

**Text is King. 👑**

This package strictly adheres to the Luzzle philosophy. While it provides a
powerful database client, the database is treated as a disposable cache. Your
Markdown files are the source of truth, forever and always.

## Usage

This library is primarily for other Luzzle tools, but feel free to use it for
your own scripts!

```bash
npm install @luzzle/core
```

### Example: Database Access

```typescript
import { getDatabaseClient } from '@luzzle/core/database/client';

const db = getDatabaseClient('/path/to/luzzle/root');
// Execute type-safe queries with Kysely 🚀
```

## Features

* **Schema Validation:** Enforces structure using Ajv. Strict but fair. ⚖️
* **File Synchronization:** Reads Markdown, updates SQLite.
* **Type-Safe Querying:** Because runtime errors are no fun.