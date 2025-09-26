# Agents.md for @luzzle/web/editor

This document provides guidance for developers and AI assistants working on the
@luzzle/web/editor package.

## Guiding Principles

The `@luzzle/web/editor` package provides a web-based interface for editing
Luzzle records. It aims to provide a user-friendly and intuitive experience for
managing Luzzle pieces directly in the browser, using WebDAV for file
synchronization.

## Architecture

This package is a SvelteKit application configured with `@sveltejs/adapter-node`
for server-side rendering. It uses the MeltUI library for UI components.

*   **Framework:** SvelteKit
*   **UI:** MeltUI
*   **Adapter:** Node.js adapter for server-side rendering.

## Key Concepts

*   **WebDAV:** The editor uses the WebDAV protocol to interact with the file
    system, allowing users to edit their Luzzle markdown files directly.
*   **Routes:** The application is structured around the following main routes:
    *   `/`: The main dashboard or entry point.
    *   `/pieces`: A view for listing and managing Luzzle pieces.
    *   `/directory`: A view for browsing the directory structure.
    *   `/asset`: A view for managing assets.

## Development

### Getting Started

1.  Install Node.js (version >=20) and npm.
2.  Install dependencies from the root of the monorepo: `npm install`
3.  Run the development server: `npm run dev -w @luzzle/web-editor`