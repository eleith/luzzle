# Agents.md for @luzzle/web.tools 🧰

## Scope
Build-time pipelines for preparing archives for the Web Explorer.

## Architecture
* **Commands**: `yargs` based CLI in `src/commands/`.
* **Integration**: Heavily utilizes `@luzzle/core` for archive traversal and `@luzzle/web.utils` for config schemas.

## Quality
* Maintain coverage standards in `vite.config.ts`.
* Focus on the efficiency of heavy-lifting tasks (image processing, DB generation).