# Agents.md for @luzzle/tools

This document provides guidance for developers and AI assistants working on the
@luzzle/tools package.

## Guiding Principles

The `@luzzle/tools` package provides a cli and sdk to perform preparation of
luzzle web assets needed to run @luzzle/web

## Architecture

This package provides an SDK and a CLI to prepare Luzzle web assets for the
`@luzzle/web` package. The tools are built with `yargs` for command-line
argument parsing and can be used programmatically via the SDK.

## Key Concepts

This package includes the following tools:

* **`check-config`**: A tool to validate the Luzzle configuration.
* **`theme`**: A tool to generate a CSS theme file from the configuration.
* **`variants`**: A tool to generate web-optimized variants for all images.
* **`opengraph`**: A tool to generate Open Graph images for all relevant pieces.
* **`sqlite`**: A tool to create a web-ready SQLite database from the main
Luzzle database.

## Development

### Getting Started

1. Install Node.js (version >=20) and npm.
2. Install dependencies from the root of the monorepo: `npm install`

### Testing

When writing tests for the `@luzzle/tools` package, please adhere to the
standards demonstrated in the existing tests. For a good example of the testing
pattern, see `packages/tools/src/tools/config-check.test.ts`.

To run the tests, use the following command:

```bash
npm run test -w @luzzle/tools
```
