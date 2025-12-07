# Luzzle

Luzzle is a lightweight specification and implementation for storing digital
records that would otherwise live in a database (like spreadsheets, CSVs, or
SQLite).

## Making it Tangible

What if your personal digital records were not the output of a 'takeout' or
'archive export' but instead the input for all applications that depend on data
that is central to you?

Digital records could be a store of books you have read, equipment in your
inventory, contacts in your address book, or your archive of poetry.

Instead of databases and spreadsheets, these records live in a `luzzle` folder.
Each `luzzle piece` is a text file representing one item in the archive.

For example, a contacts app could manage your address book. Any changes made in
the application are synchronized to your Luzzle archive.

This isn't much different from how you manage records today, but with a much
better story around data ownership, preservation, and ease of use.

Your data, your rules. 🔒

## Philosophy

Individual text files are the ultimate user interface for long-term
preservation, ownership, and ease of use.

While digital records are typically found in databases, the text file is the
format that has the unique combination of being the easiest to read and write—
now and in the future.

**Text is the ultimate UI.** Databases are powerful, but have you ever tried to
`grep` a binary file? It’s not pretty. 🕵️‍♂️

By adhering to this philosophy, you enable a Unix-like approach to layering
applications on top of your records. From CLI utilities like `grep` and `cat`
to storage services like WebDAV and rich applications like digital bookshelves.

## The Luzzle Specification

Luzzle is both a specification and an implementation.

* **Base Folder:** Your archive root.
* **`.luzzle/schemas/`:** JSON Schemas defining your piece types (e.g.,
  `book`, `film`).
* **`.assets/`:** Stores attachments (images, archives). Luzzle utilities can
  manage file uniqueness here, or you can place files manually.
* **Pieces:** Markdown files named `name.piece-type.md` (e.g.,
  `dune.book.md`). These can live in the root or any subdirectory.

A formal specification is evolving alongside the codebase. 🚧

## Packages

This monorepo contains the Luzzle ecosystem:

* **`@luzzle/core`:** The engine room. 🚂 The core specification implementation.
* **`@luzzle/cli`:** A trusty terminal companion for managing your archive. 🛠️
* **`@luzzle/web`:** A beautiful SvelteKit-based web explorer. 💅
* **`@luzzle/web-editor`:** A web-based editor (for when you don't want to use
  `vim`). 🖱️
* **`@luzzle/web.tools`:** The heavy lifters for preparing the web explorer. 🏋️
* **`@luzzle/web.utils`:** The glue holding the web packages together. 🧩