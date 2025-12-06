# Luzzle Web Tools

A collection of CLI tools for building and optimizing Luzzle Web projects.

## Overview

`@luzzle/web.tools` is the utility belt for the Luzzle Web Explorer. It
automates the generation of the web databae, web themes, Open Graph images, and
optimized assets, ensuring your web deployment is performant and visually
consistent.

The expectation is to use these tools in CI/CD to prepare your luzzle archive
for the web explorer.

## Usage

These tools are typically invoked via `npm scripts` in the Web Explorer, but can
be used manually.

```bash
# Generate theme CSS
luzzle-web-tools theme --config ./config.yaml

# Generate Open Graph images
luzzle-web-tools opengraph
```

## Key Features

* **Configuration:** manages the configuration file needed by the explorer
* **Database Generator:** Creates a searchable sqlite database derived from your
luzzle archive
* **Theme Generator:** Converts a YAML config into CSS variables.
* **Open Graph:** Automagically creates social sharing images for every piece.
* **Asset Optimization:** Resizes images for responsive web delivery.
