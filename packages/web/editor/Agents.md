# Agents.md for @luzzle/web-editor

Instructions for agents working on the `@luzzle/web-editor` package.

## Scope

The Web Editor provides a graphical interface for modifying Luzzle archives via
WebDAV.

## Architecture

- **Framework:** SvelteKit with `@sveltejs/adapter-node`.
- **Storage:** Interacts with the file system via WebDAV client.

## Key Concepts

- **WebDAV Sync:** Acts as a client, allowing remote access.
- **Editing:** User-friendly interface for metadata and content.
- **Management:** Folder interface mirroring the archive structure.

## Development

- **Dev Server:** `npm run dev`
- **Build:** `npm run build`
