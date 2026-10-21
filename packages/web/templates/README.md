# @luzzle/web.templates

Internal shared template contracts and canonical built-in sources for web and
worker. Contracts describe role props, component inputs, helpers, and prepared
server-module exports. Built-ins are raw Svelte source assets, not precompiled
constructors or a shared rendering framework.

| Import                                   | Contains                                       |
| ---------------------------------------- | ---------------------------------------------- |
| `@luzzle/web.templates/pieces/props`     | Piece page, icon, and Open Graph props         |
| `@luzzle/web.templates/site/props`       | Root, feed, and error page props               |
| `@luzzle/web.templates/components/props` | Navigation colors, icon inputs and components  |
| `@luzzle/web.templates/helpers`          | Piece, static-asset and page helper interfaces |
| `@luzzle/web.templates/bundle`           | Renderer output and piece/site name lookup     |

Use `import type` for the contract exports above; they have no JavaScript
implementation. `@luzzle/web.templates/components/*.svelte` separately exposes raw
built-in source assets. The app and worker compile those sources themselves.
Piece data keeps the existing `PublicWebPiece` shape. Type names are arbitrary
strings; narrowing one does not generate schema-derived metadata typings.

## Built-in sources

`components/icon.default.svelte` is the canonical default icon UI. The legacy app
adapter imports it, and the worker resolves and compiles the same source into
prepared bundles. It is included in production package files. Other defaults
remain in their existing locations until their cutover needs shared sources; no
placeholder defaults or duplicated implementations are introduced.

Worker depends on this package in production to read built-ins during preparation.
The package does not compile them, render requests, or bundle a Svelte runtime.

## Page navigation

Page helpers extend the base piece/static-asset helpers with
`showNavBanner(colors?)`. No call means no banner; no arguments requests the
app-owned banner with its existing defaults. Authors can override only
`background`, `color`, and `hoverColor`, including values calculated from a piece's
palette. Each call replaces the previous overrides for that render. Web owns
placement, controls, defaults, markup, CSS, and browser behavior. There is no
worker-side navigation component.

Icon and Open Graph templates retain the base `TemplateHelpers`, without page
controls or nested icon helpers.

## Page icons

Pages and Open Graph templates receive a real bundle-owned component:

```svelte
<components.PieceIcon
  piece={data.piece}
  size={{ width: 125 }}
  lazy={false}
  active={false}
/>
```

Omitted height becomes width × 1.5; lazy and active default to false. `PieceIcon`
selects the configured icon template or canonical default and renders it in place.
It is created and supplied inside the prepared bundle, sharing its Svelte runtime;
the app never supplies a component constructor across that boundary.

The icon itself remains a template role receiving `data`, resolved `options`, and
base `helpers`. It receives no `components` prop. Navigation customization stays
a page-only helper, not an embedded component.

Svelte collects scoped CSS once and applies its normal context/head semantics.
Icon head metadata is not discarded: a rendered icon title can override a direct
page title, and ordinary head metadata is not automatically deduplicated. A
throwing icon aborts the page render; the caller chooses whole-page presentation
fallback. There is no separate nested render, HTML head merger, or per-icon error
recovery. Prepared templates remain server-only; browser-reactive icon props are
not introduced by this API.

## Ownership

- This package owns shared contracts and raw built-in sources. It does not
  implement helper binding, module loading, or a rendering engine.
- The worker owns template compilation and bundling, like its existing image
  and Open Graph tools. No bundler is needed by this package.
- Web consumes prepared output. This package introduces no application wiring.

Svelte remains a development dependency for contract types. This package exports
no compiled component JavaScript or bundled Svelte runtime and adds no production
dependencies; each consumer owns compilation and its runtime.
This is not an author SDK or editor/schema declaration generator.

## Checks

Build the existing shared type dependencies first, then this package:

```sh
pnpm --filter @luzzle/core --filter @luzzle/web.config --filter @luzzle/web.db --filter @luzzle/web.pieces build
pnpm --filter @luzzle/web.templates build
pnpm --filter @luzzle/web.templates lint
```

`build` checks TypeScript source and emits declarations into `dist`. Web and worker
check contracts and raw Svelte assets through real consumers and runtime tests.
Web's existing Svelte formatter checks the assets as part of its lint command. There is no
custom bundling or unchecked declaration pass.
