# Agents.md for @luzzle/tools

This document provides guidance for developers and AI assistants working on the
@luzzle/tools package.

## Guiding Principles

The `@luzzle/tools` package provides a cli and an api (client and browser) to
provide utilities for the luzzle web explorer

## Architecture

This package provides an API and a CLI. The tools are built with `yargs` for
command-line argument parsing and can be used programmatically via the API.

## Key Concepts

This package includes the following tools:

* **`config`**: A tool to validate, get, and set values in the Luzzle
  configuration.
* **`theme`**: A tool to generate a CSS theme file from the configuration.
* **`assets`**: A tool to generate web-optimized variants for all images.
* **`opengraph`**: A tool to generate Open Graph images for all relevant pieces.
* **`sqlite`**: A tool to create a web-ready SQLite database from the main
Luzzle database.

## Development

### Getting Started

1. Install Node.js (version >=20) and npm.
2. Install dependencies from the root of the monorepo: `npm install`

### Building

To build the package for production, use the following command:

```bash
npm run build -w @luzzle/tools
```

### Linting

To run the linter and check for code quality issues, use the following command:

```bash
npm run lint -w @luzzle/tools
```

### Testing

When writing tests for the `@luzzle/tools` package, please adhere to the
standards demonstrated in the existing tests. pattern, see
`packages/tools/src/commands/assets/index.test.ts`.

To run the tests, use the following command:

```bash
npm run test -w @luzzle/tools
```
