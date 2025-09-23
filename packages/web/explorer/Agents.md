# Agents.md

This document provides guidance for developers and AI assistants working on the
Luzzle Web Explorer project.

## Guiding Principles

The Luzzle Web Explorer serves two primary purposes:

1. **A User-Friendly Interface:** It provides a web-based UI for viewing and
   searching Luzzle records, offering an alternative to the command-line tools.
2. **Web-Sharable Records:** It makes Luzzle records available on the web,
   allowing users to share them easily.

The project prioritizes a clean, simple, and intuitive user experience.

## Architecture

This is a SvelteKit application and part of the larger Luzzle monorepo.

### Monorepo Context

The Luzzle project is a monorepo with several packages. Understanding the role
of each package is crucial:

- `@luzzle/core`: Provides core functionality for interacting with the Luzzle
  database (a SQLite file).
- `@luzzle/cli`: A command-line tool for managing Luzzle records (creating,
  editing, syncing to the database).
- `@luzzle/tools`: Provides tools for preparing a Luzzle website, including
  unifying different record types into a single table for easier searching and
  display.
- `@luzzle/web/explorer` (this package): A read-only web viewer for Luzzle records.
- `@luzzle/web/editor`: A web-based editor for Luzzle records, using WebDAV.

### Data Layer

The application's data comes from a SQLite database, accessed via the
`@luzzle/core` package. The main entry point for the database is
`src/lib/database/index.ts`.

- **Data Model:** The data structures for the web explorer are defined in
  `src/lib/pieces/types.ts`. This file is the source of truth for the `WebPieces`
  and `WebPieceTags` types.

## Key Concepts

- **Piece:** A "piece" is a single Luzzle record, which is essentially a
  markdown file with associated metadata.
- **Routes:** The main routes in the application are:
  - `/`: The home page, displaying a list of all pieces.
  - `/pieces/[slug]`: Displays a single piece.
  - `/tags`: Displays a list of all tags.
  - `/tags/[slug]`: Displays all pieces with a specific tag.
  - `/search`: A page for searching through all pieces.

## Development

### Getting Started

1. Install Node.js (version >=20) and npm.
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

### UI and Styling

Shared, reusable components are located in `src/lib/components`.

Styling is handled with global CSS files located in `src/lib/ui/styles`:

- `reset.css`: A CSS reset to ensure consistent styling across browsers.
- `theme.css`: Defines the color palettes for different themes (light, dark,
  forest) and global style variables (fonts, spacing, etc.).
- `elements.css`: Global styles for common HTML elements like buttons and
  inputs.

When adding new styles, please adhere to the existing theme structure and use
the defined CSS variables

## Keeping this Document Updated

This document is a living document. As the project evolves, it's important to
keep this file up-to-date. All agents are encouraged to update this file as they
make changes to the codebase.

When making changes, please consider the following:

- **Is the change significant enough to be reflected in this document?** Small
  bug fixes or minor refactors probably don't need to be mentioned here, but new
  features, architectural changes, or changes to the development process should
  be.
- **Is the change reflected in the right place?** This document is for
  high-level guidance. Implementation details should remain in the code.
- **Is the change easy to understand?** The goal of this document is to help
  new agents get up to speed quickly. Please write in a clear and concise
  way.
