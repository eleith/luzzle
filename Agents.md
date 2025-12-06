# Luzzle Monorepo Agent Guide

This document provides instructions for Large Language Model (LLM) agents
interacting with the Luzzle monorepo.

## Monorepo Structure

This is a monorepo managed with `npm` workspaces. The packages are located in
the `packages/` directory.

Each package has its own `Agents.md` file with specific instructions for that
package. Please refer to the `Agents.md` file within a package's directory for
detailed information on how to work with that package.

## Packages

Here are the packages in this monorepo:

* `packages/cli`: The command-line interface for Luzzle.
* `packages/core`: Core functionality and library for Luzzle.
* `packages/web/editor`: The Luzzle web editor.
* `packages/web/explorer`: The Luzzle web explorer.
* `packages/web/tools`: Tools for preparing the web explorer.
* `packages/web/utils`: Shared logic for web packages.

## Guiding Principles

Luzzle seeks to manage personal digital records based on the Unix
philosophy.

* **Text is the UI:** Markdown files are the source of truth.
* **Database as Cache:** a luzzle sqlite database is a derivative of the files,
used for performance and querying, but can be rebuilt at any time.
* **Interoperability:** Luzzle is a specification (file naming, schema) and an
implementation. It plays well with other tools.

## Getting Started

1. Install Node.js (version >= 20) and npm.
2. Install dependencies from the root of the monorepo: `npm install`

## General Instructions

* Avoid running scripts from the basefolder. Instead, run them directly in the
package folder itself

## Markdown Style Guide

To maintain consistency across all `Agents.md` files, please adhere to the
following markdown styling conventions:

* **Line Length:** Keep lines to a maximum of 80 characters to ensure
    readability.
* **Headings:** Use `#` for titles and `##` for sections. Ensure a single
    space follows the `#` characters.
* **Lists:** Use `*` for unordered lists, and ensure there is a single space
    after the `*`.
* **Code Blocks:** Use backticks for inline code, and triple backticks for
    code blocks.
* **Rules"" and all other markdown lint's default [rules](https://github.com/markdownlint/markdownlint/blob/main/docs/RULES.md)

