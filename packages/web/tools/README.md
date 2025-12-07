# @luzzle/web.tools

CLI tools for building and optimizing Luzzle Web projects.

## Overview

`@luzzle/web.tools` automates database generation, theme creation, Open Graph
images, and asset optimization for the Web Explorer.

## Usage

Typically used in CI/CD or via `npm scripts`.

```bash
# Generate theme CSS
luzzle-web-tools theme --config ./config.yaml

# Generate Open Graph images
luzzle-web-tools opengraph
```

## Features

* **Configuration:** Manages explorer configuration.
* **Database Generator:** Creates a searchable SQLite database from the archive.
* **Theme Generator:** Converts YAML config to CSS variables.
* **Open Graph:** Generates sharing images for pieces.
* **Asset Optimization:** Resizes images for the web.