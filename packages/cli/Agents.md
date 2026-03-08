# Agents.md for @luzzle/cli 💻

## Scope
Command-line interface for manual archive and piece management.

## Architecture
* **Commands**: Built with `yargs` in `src/lib/commands/`.
* **Logic**: Thin wrapper around `@luzzle/core`.

## Quality
* Maintain coverage standards defined in `vite.config.ts`.
* Ensure CLI prompts remain intuitive and handle edge cases (like missing schemas) gracefully.