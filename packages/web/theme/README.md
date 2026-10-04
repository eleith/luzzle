# @luzzle/web.theme 🎨

Internal shared package that defines canonical CSS styles and typography/theme
tokens for the Luzzle web ecosystem.

## Purpose 🧠

This package exposes:

- Reset styles (`styles/reset.css`)
- Base theme layout CSS (`styles/base.css`)
- Markdown display styling (`styles/markdown.css`)
- Editor color variables derived from the configured Shiki light/dark themes
- TypeScript models for theme customization

Web pages must leverage variables from this package rather than hardcoding style
properties to preserve dark mode and custom configuration flexibility.

Editor palettes are prepared through the build-side `@luzzle/web.theme/editor`
entry point. They share `theme.markdown.code.light` and `.dark` with rendered
code blocks; the browser keeps native CodeMirror highlighting and does not load
Shiki's tokenizer. In the web app, CodeMirror emits stable token classes and
`configured.css` applies the generated colors, including existing field/link
widget colors. No palette values live in browser JavaScript:

```text
Configured Shiki names → build-side projection → theme.build.css variables
CodeMirror parser → stable token classes → configured.css rules
```

Markdown/YAML colors use a bounded scope mapping, so contextual rules such as
distinct heading-level colors may differ from rendered Shiki output. Other asset
languages reuse these basic color roles.

The ordinary page-theme generator remains synchronous and independent of editor
palette loading. Application theme CSS must be regenerated through the normal
startup/build workflow after changing the configured themes.

It is not published to npm.
