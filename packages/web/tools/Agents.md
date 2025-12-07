# Agents.md for @luzzle/web.tools

Instructions for agents working on the `@luzzle/web.tools` package.

## Scope

Provides build tools and CLI utilities for the Luzzle Web Explorer. Handles
heavy processing and file generation for CI/CD pipelines.

## Architecture

CLI tool built with `yargs`.

* **Commands:**
  * `theme`: Generates CSS variables.
  * `opengraph`: Generates OG images.
  * `assets`: Generates resized images.
  * `sqlite`: Creates the web database.

## Key Concepts

* **Build-Time Generation:** Tools run before the Web Explorer starts or during
  Docker builds.

## Development

* **Test:** `npm test`
* **Build:** `npm run build`