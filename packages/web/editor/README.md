# Luzzle Web Editor

A web-based editor for managing your Luzzle pieces.

## Overview

The Luzzle Web Editor allows you to write, edit, and organize your Luzzle
archive from any browser. Today, it only connects to your storage via WebDAV.

## Usage

The editor is typically deployed as a companion container to your WebDAV server
and you must bring your own authentication (ex: proxy auth)

```bash
# Run the development server
npm run dev -w @luzzle/web-editor
```

## Key Features

* **WebDAV Integration:** Connects to standard WebDAV servers to manage your
    files.
* **Visual Editing:** Edit frontmatter and Markdown content in a GUI.
* **Asset Management:** Upload and attach images to your pieces.
