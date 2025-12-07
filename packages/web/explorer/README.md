# @luzzle/web

The official web viewer for Luzzle archives.

## Overview

Luzzle Web Explorer is a SvelteKit application for browsing personal archives.
It connects to Luzzle data to display records in a rich interface.

## Usage

The recommended way to run the Web Explorer is via Docker.

### Quick Start (Docker)

1. Create a `Dockerfile` based on `examples/Dockerfile.custom`.
2. Build and run:

```bash
docker build -t my-luzzle-explorer .
docker run -p 3000:3000 my-luzzle-explorer
```

## Features

- **Performance:** SvelteKit-based.
- **Rich Media:** Displays optimized images and Open Graph tags.
- **Themable:** Configurable via `config.yaml`.

## Configuration

Configured via `config.yaml`.

**Key Sections:**

- **url:** Application URLs.
- **text:** Site title and description.
- **paths:** Database and config paths.
- **content:** Content roots and feeds.
- **pieces:** Display settings for piece types.
- **theme:** Colors, fonts, and styles.

For advanced configuration, use `@luzzle/web.tools`.
