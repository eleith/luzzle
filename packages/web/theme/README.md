# @luzzle/web.theme 🎨

Internal shared package that defines canonical CSS styles and typography/theme
tokens for the Luzzle web ecosystem.

## Purpose 🧠

This package exposes:

- Reset styles (`styles/reset.css`)
- Base theme layout CSS (`styles/base.css`)
- Markdown display styling (`styles/markdown.css`)
- TypeScript models for theme customization

Web pages must leverage variables from this package rather than hardcoding style
properties to preserve dark mode and custom configuration flexibility.

It is not published to npm.
