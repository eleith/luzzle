# Luzzle Monorepo Agent Guide

This document provides instructions for Large Language Model (LLM) agents
interacting with the Luzzle monorepo.

## Monorepo Structure

This is a monorepo managed with `npm` workspaces. The packages are located in
the `packages/` directory.

Each package has its own `Agents.md` file with specific instructions. Refer to
the package's `Agents.md` for detailed information.

## Packages

* `packages/cli`: Command-line interface.
* `packages/core`: Core library.
* `packages/web/editor`: Web editor.
* `packages/web/explorer`: Web explorer.
* `packages/web/tools`: Build tools for web explorer.
* `packages/web/utils`: Shared web logic.

## Guiding Principles

Luzzle manages personal digital records based on the Unix philosophy.

* **Text is the UI:** Markdown files are the source of truth.
* **Database as Cache:** A Luzzle SQLite database is a derivative of the files,
  used for querying.
* **Interoperability:** Luzzle is a specification and implementation that plays
  well with other tools.

## Getting Started

1. Install Node.js (version >= 20) and npm.
2. Install dependencies: `npm install`

## General Instructions

* Run scripts directly in the package folder, not from the root.

## Markdown Style Guide

Adhere to the following conventions for all `Agents.md` files:

* **Line Length:** Maximum 80 characters.
* **Headings:** Use `#` for titles and `##` for sections.
* **Lists:** Use `*` for unordered lists with a single space after each bullet.
* **Code Blocks:** Use backticks.
* **Rules:** Follow standard markdown lint rules.
