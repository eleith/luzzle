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
* `packages/core`: Core functionality and libraries for Luzzle.
* `packages/tools`: Various tools for development and automation.
* `packages/web/editor`: The Luzzle web editor.
* `packages/web/explorer`: The Luzzle web explorer.

## Getting Started

1. Install Node.js (version >= 20) and npm.
2. Install dependencies from the root of the monorepo: `npm install`

## General Instructions

* Use `npm run <script> -w <package-name>` to run scripts for a specific
package. For example, `npm run test -w @luzzle/core`.
* Run linting for the entire monorepo: `[TODO: add command]`
* Run tests for the entire monorepo: `[TODO: add command]`

## Keeping this Document Updated

All Agents.md documents are living documents. As the project evolves, it's
important to keep these files up-to-date. All agents are encouraged to update
this file as they make changes to the codebase.

When making changes, please consider the following:

* Is the change significant enough to be reflected in this document? Small bug
fixes or minor refactors probably don't need to be mentioned here, but
significant new features, architectural changes, or changes to the development
process should be.
* Is the change reflected in the right place? This document is for high-level
guidance. Implementation details should remain in the code.
* Is the change easy to understand? The goal of this document is to help new
agents get up to speed quickly. Please write in a clear and concise way

## Markdown Style Guide

To maintain consistency across all `Agents.md` files, please adhere to the
following markdown styling conventions:

* **Line Length:** Keep lines to a maximum of 80 characters to ensure
readability.
* **Headings:** Use `#` for titles and `##` for sections. Ensure a single space
follows the `#` characters.
* **Lists:** Use `*` for unordered lists, and ensure there is a single space after the `*`.
* **Code Blocks:** Use backticks for inline code, and triple backticks for code blocks.
