# Luzzle Monorepo Agent Guide 🧩

This guide provides context and instructions for agents interacting with the Luzzle monorepo.

## Monorepo Structure

Luzzle is a monorepo managed with `pnpm` workspaces.

* `@luzzle/core`: The engine room (specification implementation) 🫀
* `@luzzle/cli`: Terminal companion for manual piece management 💻
* `@luzzle/lsp`: Language Server Protocol proxy for IDE integrations 🗣️
* `@luzzle/web`: SvelteKit web explorer and editor 🔎
* `@luzzle/web.worker`: Sidecar service that runs heavy publish jobs off a shared queue 👷
* `@luzzle/web.config`: Shared configuration and schemas for the web stack (internal-only) ⚙️
* `@luzzle/web.lsp`: WebSocket bridge for the LSP in the browser 🗣️
* `@luzzle/web.proxy`: Snappy caching layer for web deployments 🚀

## Guiding Principles

* **Source of Truth**: Markdown files are the source of truth; the database is a disposable cache.
* **Consistency**: Follow existing patterns for linting, testing, and architecture.
* **Core First**: Use `@luzzle/core` abstractions for all piece and archive operations.
* **Quality**: Maintain test coverage levels as defined in each package's `vitest` configuration.