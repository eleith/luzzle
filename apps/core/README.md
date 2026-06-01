# @luzzle/core 🫀

TypeScript implementation of the Luzzle specification.

Luzzle is a specification designed to solve the challenges of managing digital
records using plain text files instead of proprietary databases or spreadsheets.
`@luzzle/core` provides the tooling to define, parse, and validate these text
records ("pieces") and attachments so they can be easily queried, indexed, and
synced to a database.

---

## Core Concepts 🏗️

### 1. Pieces & Schemas

The core of the Luzzle spec is the **Piece**: a standard Markdown file with
structured YAML frontmatter. `@luzzle/core` validates these pieces using
standard JSON schemas (typically defined in your archive under
`.luzzle/schemas/`). This gives you uniform, type-safe records without holding
your data hostage.

### 2. Assets & Attachments

A digital garden is not just text. `@luzzle/core` defines conventions for how
non-text media (like images or PDF attachments) are stored within the
`.assets/` directory and referenced in a piece's metadata.

### 3. File Naming Convention

To associate a piece with its schema, Luzzle relies on a specific file naming
convention: `name.[piece-type].md` (e.g., `dune.books.md`). This naming
convention solves the problem of quickly identifying a piece's type to map it
to the correct validator. _Note: This convention might be evolved or removed
in the future, but remains the current way piece types are discovered._

### 4. Simple Filesystem Backend

To adhere to the Unix philosophy, `@luzzle/core` **only** implements a simple
local filesystem backend. It reads Markdown files, validates frontmatter, and
updates a derivative SQLite index for query performance.

Upstream apps (such as `@luzzle/web` or custom deploy scripts) are responsible
for handling remote storage backends (like WebDAV or cloud storage syncing).
