# Agents.md for @luzzle/web-editor

This document provides guidance for developers and AI assistants working on the
@luzzle/web-editor package.

## Guiding Principles

The Luzzle Web Editor provides a web graphical interface for modifying Luzzle
archives. Unlike the CLI, it offers a rich text editing experience in the
browser, leveraging WebDAV to sync changes back to the file system.

## Architecture

- **Framework:** SvelteKit with `@sveltejs/adapter-node`.
- **Storage:** Interacts with the file system via WebDAV.

## Key Concepts

- **WebDAV Sync:** The editor acts as a WebDAV client, allowing it to run
  separately from the physical location of the files (e.g., accessing a remote
  server).
- **Editing:** Provides a user-friendly interface for editing metadata and the
  main content of each piece.
- **Management:** Provides a folder like interface mirroring the folder
  structure of the luzzle archive

## Development

- **Dev Server:** `npm run dev`
- **Build:** `npm run build`
