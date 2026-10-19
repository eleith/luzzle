# @luzzle/web.templates

Internal shared template contracts for web and worker. This first version
contains **types only**: role props, component inputs, and helper interfaces.
It reuses the reviewed contracts without introducing a rendering framework.

| Import                                   | Contains                                       |
| ---------------------------------------- | ---------------------------------------------- |
| `@luzzle/web.templates/pieces/props`     | Piece page, icon, and Open Graph props         |
| `@luzzle/web.templates/site/props`       | Root, feed, and error page props               |
| `@luzzle/web.templates/components/props` | Navigation/icon inputs and page components     |
| `@luzzle/web.templates/helpers`          | Bound piece and static-asset helper interfaces |

Use `import type`. These exports have no JavaScript implementation.
Piece data keeps the existing `PublicWebPiece` shape. Type names are arbitrary
strings; narrowing one does not generate schema-derived metadata typings.

## Ownership

- This package describes the shared inputs. It does not implement helpers yet.
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
pnpm --filter @luzzle/web.templates test
```

`build` checks the source and emits declarations into `dist`. `test` checks the
named accepted/rejected examples in `test/types/props.typecheck.ts`; nothing in
that file executes. There is no custom bundling or unchecked declaration pass.
