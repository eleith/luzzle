# Agents.md for @luzzle/web.utils

Instructions for agents working on the `@luzzle/web.utils` package.

## Scope

Shared library for `@luzzle/web` (Explorer) and `@luzzle/web.tools`. Prevents
code duplication for types and helpers.

## Architecture

* **Exports:**
  * `lib/assets.ts`: Asset paths and types.
  * `lib/config`: Configuration schemas.
  * `lib/types.ts`: Shared TypeScript interfaces.

## Key Concepts

* **Single Source of Truth:** Defines shared types for the web ecosystem.

## Development

* **Test:** `npm test`
* **Build:** `npm run build`