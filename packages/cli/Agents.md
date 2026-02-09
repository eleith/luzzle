# Agents.md for @luzzle/cli 💻

## Scope
Command-line interface for manual archive and piece management.

## Architecture
* **Commands**: Built with `yargs` in `src/lib/commands/`.
* **Logic**: Thin wrapper around `@luzzle/core`.

## Quality
* Maintain 100% test coverage for all command logic and utilities.
* Ensure CLI prompts remain intuitive and handle edge cases (like missing schemas) gracefully.