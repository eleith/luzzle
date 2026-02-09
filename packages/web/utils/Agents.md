# Agents.md for @luzzle/web.utils 🛠️

## Scope
Shared types, configuration schemas, and utility functions for web packages.

## Architecture
* **Config**: Defines the master JSON schema and default values for the web stack.
* **Types**: Central source of truth for shared TypeScript interfaces.

## Quality
* Maintain 100% test coverage as defined in `vite.config.ts`.
* Strict mode in Ajv must be maintained for all schema changes.