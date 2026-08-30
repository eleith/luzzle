# Changesets

Welcome to Changesets! This directory contains configuration and recorded changesets for upcoming releases.

- Run `pnpm changeset` to record a change (major, minor, or patch) for `@luzzle/web`, `@luzzle/web.worker`, `@luzzle/cli`, `@luzzle/core`, or `@luzzle/lsp`.
- When ready to release, run `pnpm version:apps` to consume all pending changesets, synchronize package versions in lockstep, and compile `CHANGELOG.md` files.
- Run `pnpm tag:apps` to generate the corresponding Git tags.
