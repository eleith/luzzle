# Agents.md for @luzzle/tools

This document provides guidance for developers and AI assistants working on the
@luzzle/tools package.

## Guiding Principles

The `@luzzle/tools` package provides a collection of command-line utilities to
automate common development and asset generation tasks within the Luzzle
monorepo. These tools are designed to be run from the command line and are
configured using command-line arguments.

## Architecture

This package contains a set of independent, single-purpose CLI tools. Each tool
is located in its own directory within `src/` and uses the `yargs` library to
parse command-line arguments. The main entry point for each tool is typically an
`index.ts` file, with argument parsing logic in `yargs.ts`.

## Key Concepts

This package includes the following tools:

*   **`generate-image-variants`**: A tool to create different formats (e.g.,
    `avif`, `jpg`) and sizes of a specific image asset.
*   **`generate-open-graph`**: A utility to generate Open Graph images (e.g., for
    social media sharing) from a template file.
*   **`generate-web-images`**: A comprehensive tool for preparing images for the
    web. It has two main commands:
    *   `variants`: Generates web-optimized variants for all images.
    *   `opengraph`: Generates Open Graph images for all relevant pieces.
*   **`generate-web-sqlite`**: A tool to create a web-ready SQLite database from
    the main Luzzle database.

## Development

### Getting Started

1.  Install Node.js (version >=20) and npm.
2.  Install dependencies from the root of the monorepo: `npm install`
3.  You can run each tool directly using `node`, for example: `node
    packages/tools/dist/generate-image-variants/index.js --help`