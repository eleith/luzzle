# @luzzle/core

The core library for Luzzle, bridging Markdown files and a structured database.

## Overview

`@luzzle/core` parses Markdown files, validates them against JSON schemas, and
synchronizes data into a SQLite database.

This package is used by other Luzzle tools (CLI, Web Explorer)

## Philosophy

This package adheres to the principle that **Text is the Source of Truth**. The
database is treated as a derivative cache for performance, ensuring Markdown
files remain the primary data source.

## Installation

```bash
npm install @luzzle/core
```

## Features

* **Schema Validation:** Enforces frontmatter structure using Ajv.
* **Synchronization:** Updates the local SQLite database from Markdown files.
* **Querying:** Exports a Kysely client for data access.
