# Luzzle Web Explorer

a web viewer and editor for Luzzle archives.

## Overview

Luzzle Web Explorer is a beautiful, fast, and responsive web application for
browsing and managing your personal archives.

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
- **Integrated Editor:** Edit content and upload assets directly. ✏️
- **AI Powered:** Generate metadata for your pieces using Gemini. 🤖
- **Rich Media:** Displays optimized images and nice Open Graph tags.
- **Themable:** Make it yours via `config.yaml`. 🎨

## Configuration

The Web Explorer is configured using a `config.yaml` file.

**Key Sections:**

- **url:** Where does this live on the internet?
- **text:** Site title and description.
- **auth:** OIDC configuration to enable the editor (optional).
- **storage:** Backend storage (filesystem or WebDAV) for editing.
- **ai:** API keys for generation features.
- **pieces:** Defines how different piece types are displayed.
- **theme:** Colors, fonts, and dark mode! 🌙

For advanced configuration, check out `@luzzle/web.tools`
