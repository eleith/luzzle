# @luzzle/web.db 🗄️

Internal shared database client wrapper and table schemas for Luzzle's web
stack.

## Purpose 🧠

This package maps tables that extend the base `@luzzle/core` SQLite index:

- Aggregated metadata tables for web pages and search.
- Sidequest job queues and execution logs.
- Snappy full-text search indices.

Both the SvelteKit frontend (`@luzzle/web`) and background worker
(`@luzzle/web.worker`) use this library to query and mutate the shared database
file.

It is not published to npm.
