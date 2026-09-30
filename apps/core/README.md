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

#### Preparing, creating, and saving a piece

`Piece.create(directory, name)` prepares an in-memory Markdown value and checks
whether its destination already exists. It does not reserve or write the file.
After completing review and any asset preparation, use
`Piece.write(markdown, { createOnly: true })` for the first write. It validates
and serializes the metadata and body before creating parent directories, then
uses `LuzzleStorage.createFile()` (filesystem flag `wx`). If another writer has claimed the destination, the write rejects
with `code: 'EEXIST'` without overwriting it. Keep the reviewed draft so the user
can choose a different destination.

Use `Piece.write(markdown)` for ordinary Save; it still overwrites existing files.
Custom storage implementations must implement `createFile(path, contents)` with
exclusive creation semantics, not an existence check followed by an overwrite.

Exclusive creation is not a transaction: a failed write can leave an empty or
partial new file, and parent directories can remain. There is no automatic
path-based deletion on failure, since that could delete another writer's file.
Asset preparation remains separate; neither write mode rolls back attachments.
The filesystem backend's path checks are lexical: archive parent directories
must be trusted. Exclusive creation does not prevent following a parent-directory
symlink outside the archive.

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
