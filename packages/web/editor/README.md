# @luzzle/web-editor

A web-based editor for managing Luzzle pieces.

## Overview

The Luzzle Web Editor enables writing, editing, and organizing Luzzle archives
from a browser. It currently connects to storage via WebDAV.

## Usage

Deployed as a container alongside a WebDAV server. Authentication (e.g., proxy
auth) is handled externally.

```bash
# Run the development server
npm run dev -w @luzzle/web-editor
```

## Features

- **WebDAV Integration:** Connects to WebDAV servers.
- **Visual Editing:** GUI for frontmatter and Markdown content.
- **Asset Management:** Upload and attach images.
