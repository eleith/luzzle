# Luzzle 🧩

Luzzle is a text-based system for managing your digital records. It turns a
simple folder of Markdown files into a portable, personal database that you
actually own.

## What is a record? 📁

Think of it as a personal library for everything you care about—books you've
read, gear in your inventory, contacts in your address book, or even an archive
of poetry.

Instead of being trapped in a spreadsheet or a proprietary app, these records
live in your `archive` folder. Each `piece` is just a Markdown file representing
a single item. 📝✨

## Why Text? 🧠

We believe plain text is the best format for long-term preservation and
ownership. It’s the original WYSIWYG interface—human-readable, machine-writable,
and it won't hold your data hostage.

By using text, we get to stand on the shoulders of giants. We don't need to
reinvent search, syncing, or versioning when we can just use the Unix tools that
have already solved those problems for decades.

## The Spec 🏗️

Luzzle is both a set of rules and the code to run them.

* Your archive is just a root folder.
* JSON schemas live in `.luzzle/schemas/` to define your piece types (like
`book` or `film`). 📂
* Attachments like images and archives stay in the `.assets/` folder. 🖼️
* Pieces use a simple naming convention: `name.piece-type.md` (e.g.,
`dune.book.md`).

The formal specification is still evolving alongside the codebase. 🚧

## The Monorepo 📦

This ecosystem contains everything you need to build and browse your archive:

* `@luzzle/core` the specification implementation 🫀
* `@luzzle/cli` the terminal companion for managing pieces 💻
* `@luzzle/lsp` auto-complete in your editor while editing pieces ✏️
* `@luzzle/web` a simple web app for browsing and editing pieces 🔎
* `@luzzle/web.builder` deploys, builds and rebuilds archives for the web 🏗️
* `@luzzle/web.tools` CLI utilities used by the web.builder 🧰
* `@luzzle/web.lsp` websocket server for luzzle lsp 💂
* `@luzzle/web.proxy` a caching layer for @luzzle/web 🚀
* `@luzzle/web.utils` common logic used by @luzzle/web and tools 🛠️

## Future Ideas 🚀

* [@luzzle/web] hardcoded Base32 seeds for stateless 2FA
* [@luzzle/web] UI for managing schemas
* [@luzzle/web] enable preview before build/generate
* [@luzzle/web] enable text attachments direct editing
* [@luzzle/cli] improved first time experience (ex: zero conf support)
* [@luzzle/core] support drive, icloud, dropbox
* [@luzzle/core] implement webdav storage sync
* [@luzzle/core] explore tauri port
* [@luzzle/builder] add build one piece job
