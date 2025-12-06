# Luzzle

What if your personal digital records where not the output of a 'takeout' or
'archive export' but instead the input for all you personal applications,
services and more?

Luzzle is a lightweight specification and tool for storing digital records to
enable archives as the source of truth, instead of the other way around.

## Making it Tangible

Digital records could be a store of books you have read, equipment in your
inventory, contacts in your address book, all the poems you have written or
anything else you might have in mind that perhaps you would have stored in a
spreadsheet at some point in time.

A folder for all your records is your `luzzle` archive and each text file
representing one record is your `luzzle piece`.

You could have a contacts app manage your address book or a website for your
bookshelf. Any changes made in the application would be synchronized to your
luzzle archive and visa versa.

This is not that much different than how you create, manage use your digital
records today. Yet, with a much stronger story around data ownership,
preservation and ease of use.

You get to bring your own editor, your own storage and much more.

## Philosophy

Individual text files are the ultimate user interface for both long term
preservation, ownership and ease of use.

While digital records are typically found in databases (ex: spreadsheets), the
textfile is the format that has the unique combination of being the easist to
read, write now and in the future as technology and computation evolve.

The text file is the ultimate user interface and user experience.

By adhering to this philosophy, you enable a unix-like philosophy when it comes
to layering applications and services on top of your records. From CLI utilities
like grep, cat, pipe, to storage services like webdav, local filesystems or
cloud storage to applications like address books or websites like bookshelves.

## The Luzzle Specification

Luzzle is both a specification and an implementation.

* **Base Folder:** Your archive root.
* **`.luzzle/schemas/`:** JSON Schemas defining your piece types (e.g.,
    `book`, `film`).
* **`.assets/`:** Stores attachments (images, archives). Luzzle utilities can
    manage file uniqueness here, or you can place files manually.
* **Pieces:** Markdown files named `name.piece-type.md` (e.g.,
    `dune.book.md`). These can live in the root or any subdirectory.

A formal specification has not yet been written as it is evolving in the
codebase itself.

## Packages

This monorepo contains many supporting tools for the Luzzle ecosystem:

* **`@luzzle/core`:** the core luzzle specification implementation
* **`@luzzle/cli`:** Helps you create luzzle pieces and manage your archive from
the terminal.
* **`@luzzle/web`:** A SvelteKit-based web explorer for your luzzle archive.
* **`@luzzle/web-editor`:** A web-based editor for your luzzle pieces (only
webdav is supported currently)
* **`@luzzle/web.tools`:** tools needed to prepare the web database and UI customizations
for the luzzle web explorer
* **`@luzzle/web.utils`:** shared logic needed by both the web explorer and web
tools
