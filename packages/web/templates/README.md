# @luzzle/web.templates

Internal shared template contracts for web and worker. This first version
contains **types only**: role props, component inputs, helper interfaces, and the
prepared server module's exports.
It reuses the reviewed contracts without introducing a rendering framework.

| Import                                   | Contains                                           |
| ---------------------------------------- | -------------------------------------------------- |
| `@luzzle/web.templates/pieces/props`     | Piece page, icon, and Open Graph props             |
| `@luzzle/web.templates/site/props`       | Root, feed, and error page props                   |
| `@luzzle/web.templates/components/props` | Navigation colors, icon inputs and page components |
| `@luzzle/web.templates/helpers`          | Piece, static-asset and page helper interfaces     |
| `@luzzle/web.templates/bundle`           | Renderer output and piece/site name lookup         |

Use `import type`. These exports have no JavaScript implementation.
Piece data keeps the existing `PublicWebPiece` shape. Type names are arbitrary
strings; narrowing one does not generate schema-derived metadata typings.

## Page navigation

Page helpers extend the base piece/static-asset helpers with
`showNavBanner(colors?)`. No call means no banner; no arguments requests the
app-owned banner with its existing defaults. Authors can override only
`background`, `color`, and `hoverColor`, including values calculated from a piece's
palette. Each call replaces the previous overrides for that render. Web owns
placement, controls, defaults, markup, CSS, and browser behavior. There is no
worker-side navigation component.

Icon and Open Graph templates retain the base `TemplateHelpers`. The remaining
`PageComponents.PieceIcon` declaration is not a claim of prepared runtime
integration; a real icon-rendering helper is still being evaluated.

## Ownership

- This package describes shared inputs and prepared-module exports. It does not
  implement helpers or module loading.
- The worker owns template compilation and bundling, like its existing image
  and Open Graph tools. No bundler is needed by this package.
- Web consumes prepared output. This package introduces no application wiring.

Svelte is a development dependency only for its `Component` type. There are no
runtime imports of Svelte, no bundled Svelte runtime, and no production dependencies.
This is not an author SDK or editor/schema declaration generator.

## Checks

Build the existing shared type dependencies first, then this package:

```sh
pnpm --filter @luzzle/core --filter @luzzle/web.config --filter @luzzle/web.db --filter @luzzle/web.pieces build
pnpm --filter @luzzle/web.templates build
pnpm --filter @luzzle/web.templates lint
```

`build` checks the source and emits declarations into `dist`. Web and worker
check the contracts through their real consumers and runtime tests. There is no
custom bundling or unchecked declaration pass.
