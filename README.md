# Luzzle 🧩

Luzzle is a text-first approach for managing your digital garden. It enables
a folder of Markdown files to be used as a database for web, desktop or
mobile projects.

a database which you own and control. in real time.

no takeout needed.

## What is a digital garden? 📁

Think of it as a personal library for anything you want to record. books you've
read, gear in your inventory, contacts in your address book or all the poems
you've written.

Instead of being trapped in a spreadsheet or a proprietary app, these records
live in an `archive` folder. Each `piece` is just a Markdown file representing
a single item. 📝✨

## Why Text? 🧠

Plain text is the best (hands down!) format for long-term preservation and
ownership. It’s the original WYSIWYG interface: human-readable, machine-writable,
and it won't hold your data hostage.

By using text, we get to stand on the shoulders of giants. We don't need to
reinvent search, syncing, or versioning when we can just use the Unix tools that
have already solved those problems for decades.

## Three Ways to Use Luzzle 🚀

Depending on how you want to interact with your garden, Luzzle offers three
entry points. Use one, two or all three. It's a buffet!

- **The CLI (`@luzzle/cli`)** — _Just get a database._ A command-line companion
to quickly initialize and sync your Markdown archive into a local SQLite index.
Great if you just want to run queries or plug Luzzle into your own scripts. See
the [CLI README](./packages/cli/README.md) for usage and commands.

- **The LSP (`@luzzle/lsp`)** — _Schema-aware editing._ Get autocomplete, schema
validation, and diagnostics inside your editor (like Neovim) as you edit your
piece frontmatter. It hooks into any LSP-compatible editor.

- **The Web Stack (`@luzzle/web`)** — _Digital garden on the web._ A responsive
  SvelteKit explorer/admin interface, a background Sidequest worker to sync and
  transform assets, and a caching reverse proxy. It runs via Docker Compose—making
  it the heaviest to deploy, but also the most complete.

## The Spec 🏗️

Luzzle is both a set of rules and the code to run them.

- Your archive is just a root folder.
- JSON schemas live in `.luzzle/schemas/` to define your piece types (like
  `book` or `film`). 📂
- Attachments like images and archives live in an `.assets/` folder. 🖼️
- Pieces use a simple naming convention: `name.piece-type.md` (e.g.,
  `dune.book.md`).

The formal specification is still evolving alongside the codebase. 🚧

## The Monorepo 📦

This ecosystem contains a few projects to manage a luzzlel archive:

- `@luzzle/core` the specification implementation 🫀
- `@luzzle/cli` the terminal companion for managing pieces 💻
- `@luzzle/lsp` auto-complete in your editor while editing pieces ✏️

a set of services to power a luzzle web app:

- `@luzzle/web` web app for browsing, editing and publishing pieces 🔎
- `@luzzle/web.worker` sidecar service that handles web jobs 👷
- `@luzzle/web.proxy` a caching layer for @luzzle/web 🚀
- `@luzzle/web.lsp` websocket server for luzzle lsp 💂

and some shared packages used for the web project:

- `@luzzle/web.config` shared configuration schemas for the web stack ⚙️
- `@luzzle/web.job` shared job definitions
- `@luzzle/web.theme` shared css styles and theme types
- `@luzzle/web.pieces` shared piece definitions and helpers

## Future Ideas 🚀

- [@luzzle/web] hardcoded Base32 seeds for stateless 2FA
- [@luzzle/web] UI for managing schemas
- [@luzzle/web] enable directly editing text attachments
- [@luzzle/web] preview publish impact before publishing
- [@luzzle/cli] improved first time experience (ex: zero conf support)
- [@luzzle/cli] rclone support like web
- [@luzzle/core] explore tauri port

## Development & Philosophy 🛠️

If you'd like to contribute or understand the design principles behind the
codebase, check out the [Development Philosophy &
Standards](./docs/development.md).

If you are working on the web stack, please also review the [Web Development
Standards](./packages/web/docs/development.md) (such as offloading intensive
work to the Sidequest worker and leveraging theme variables for styling
consistency).
