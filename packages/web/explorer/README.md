# Luzzle Web Explorer

The official web viewer for Luzzle archives. Because your data deserves to look
good. 💅

## Overview

Luzzle Web Explorer is a beautiful, fast, and responsive web application for
browsing your personal archive. It connects to your Luzzle data to display your
books, films, and writings in a rich interface.

## Usage

The recommended way to run this is via Docker. 🐳

### Quick Start (Docker)

You can build a custom image that includes your configuration and content.

1. Create a `Dockerfile` based on the example in `examples/Dockerfile.custom`.
2. Build and run:

```bash
docker build -t my-luzzle-explorer .
docker run -p 3000:3000 my-luzzle-explorer
```

## Key Features

- **Fast & Responsive:** Built on SvelteKit. ⚡
- **Rich Media:** Displays optimized images and nice Open Graph tags.
- **Themable:** Make it yours via `config.yaml`. 🎨

## Configuration

The Web Explorer is configured using a `config.yaml` file.

**Key Sections:**

- **url:** Where does this live on the internet?
- **text:** Site title and description.
- **pieces:** Defines how different piece types are displayed.
- **theme:** Colors, fonts, and dark mode! 🌙

For advanced configuration, check out `@luzzle/web.tools`.
