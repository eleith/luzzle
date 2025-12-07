# Luzzle Web Tools

The heavy lifters for Luzzle Web. 🏋️

## Overview

`@luzzle/web.tools` is the utility belt for the Web Explorer. It automates the
generation of the web database, themes, Open Graph images, and assets. It does
the hard work so the browser doesn't have to.

## Usage

These tools are typically used in CI/CD pipelines.

```bash
# Generate theme CSS
luzzle-web-tools theme --config ./config.yaml

# Generate Open Graph images
luzzle-web-tools opengraph
```

## Key Features

* **Database Generator:** Creates a searchable SQLite database. 🗄️
* **Theme Generator:** Converts config to CSS variables.
* **Open Graph:** Automagically creates social sharing images. 🖼️
* **Asset Optimization:** Resizes images for the web.
