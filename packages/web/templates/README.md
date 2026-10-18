# @luzzle/web.templates

Internal, unpublished, release-built SSR runtime. This package provides the
rendering boundary; it does **not** activate customization or implement the
complete piece/site role contract, worker preparation, or navigation-placement
validation.

## Build and test

After installing workspace dependencies, from the repository root:

```sh
pnpm --filter @luzzle/web.templates build
pnpm --filter @luzzle/web.templates lint
pnpm --filter @luzzle/web.templates test
```

Tests use native `node:test`, not Vite. Build first: every export, including the
`development` condition, deliberately points to `dist/*.js`. No source-first
condition is available. Native isolation tests additionally run separate Node
processes with production, development, and combined conditions.

The only dependencies are development dependencies. Svelte, Rollup,
node-resolve, Acorn, and MagicString are exact-pinned; the compiler is used only
by the build and test preparation. Build one strict multi-entry Rollup graph
with Node/production resolution. All three runtime facades, shared chunks, and
the real framework-owned `.svelte` adapters/default icon belong to that graph.
Only Node builtins may remain external. The pinned upstream crypto fallback is
AST-normalized to a literal `node:crypto` import; unexpected helper changes fail
the build rather than admitting variable imports. Do not pass application-owned
Svelte components across this boundary or bundle another runtime into prepared
modules.

Build output is cleaned before each release build. Tests and reusable helpers
create artifacts only in caller-selected directories; package tests use
`node_modules/.cache/` and clean their scratch trees. Nothing uses `/tmp`.

## Minimal runtime API

```js
import { renderTemplate, components } from '@luzzle/web.templates';
import { assertCompatible } from '@luzzle/web.templates/compatibility';

// Read and parse inert compatibility.json BEFORE importing executable modules.
assertCompatible(preparedMetadata);
const { default: Page } = await import(preparedModuleUrl);
const result = renderTemplate(Page, {
	props: { data, helpers },
	iconForPiece: (piece) => preparedIcons.get(piece.type),
	context: new Map(),
	fallback: BuiltInFallback // optional; attempted exactly once with fresh state
});
// { body, head, navigation, usedFallback }
```

`head` contains Svelte head markup **and injected styles**. The wrapper forces
Svelte's lazy synchronous result inside its exception boundary. Navigation is
request-local: `components.NavBanner` records inputs without rendering interactive
navigation. Duplicate banners fail. `components.PieceIcon` selects a prepared
icon, or the generic default, and passes the same request's helpers. It adds no
styling wrapper: each icon owns its single root and initializes its `active`
class from options. The app host can then toggle that root class without
rerendering the icon. This is a minimal boundary, not full size, placement, role,
or author-input validation. There is no async template support.

A failed render's head/navigation are discarded. An optional fallback receives
fresh recorder state, but the same props/icon selector; a fallback failure
propagates rather than recursively retrying. Arbitrary author code is not
sandboxed. Auth, route/cache policy, manifest publication and logging belong to
the consumers, not this presentation-only fallback.

Pinned internal facades:

| Compiler import          | Prepared-module import                          |
| ------------------------ | ----------------------------------------------- |
| `svelte`                 | `@luzzle/web.templates/runtime/svelte`          |
| `svelte/internal/server` | `@luzzle/web.templates/runtime/internal-server` |
| `svelte/server`          | `@luzzle/web.templates/runtime/server`          |

Keep this package external to Vite SSR, including development. Consumers must
prove native `render`/`getContext` identity against both their real Vite dev
server and built SSR bridge. Native package tests cannot prove that integration.

## Compatibility metadata

`@luzzle/web.templates/compatibility.json` is generated alongside the graph;
`compatibility` exports the same deeply frozen object. It includes:

- Schema version, exact Svelte compiler version, and all fixed options:
  `generate: 'server'`, `dev: false`, `css: 'injected'`,
  `experimental: { async: false }`.
- Release package/tool versions and Node/production resolution conditions.
- SHA-256 fingerprint of the complete emitted runtime/adapters graph, with an
  invariant fingerprint placeholder to avoid a self-referential hash.

Compiler configuration, runtime code, framework adapters, and their compiled CSS
therefore participate in compatibility. Source filenames are checkout-relative;
no timestamp or absolute checkout path is intentionally emitted. A native test
builds two different checkout paths and compares every emitted byte. Metadata is
not a signature or an untrusted-code security boundary.

## Reusable integration-proof helpers

These are **repository test helpers**, not production exports. Import individual
files (or `test/support/index.js`) by repository-relative URL:

```js
import { prepareFixtures } from './test/support/prepare-fixtures.js';
import { checkPreparedFixtures } from './test/support/check-fixtures.js';
import { prepareIsolatedFixture } from './test/support/prepare-isolated.js';
```

### `await prepareFixtures(outputDir)`

Returns `{ directory, modules, compatibilityPath }`, all absolute paths.
`modules` has keys `page`, `icon`, `throwing`, `noNavigation`,
`duplicateNavigation`, and `contextProbe`. It compiles real files from
`test/fixtures/` using the fixed options, stable source IDs, and an AST-only
import-source rewrite. Unknown imports/reexports and all dynamic imports fail
closed; ordinary strings/comments/templates are untouched. This is fixture
preparation, not the future production worker compiler or subset validator.

The caller owns cleanup and **must supply an output directory whose native Node
package ancestry resolves `@luzzle/web.templates`**, for example beneath
`apps/web/node_modules/.cache/` after the web consumer dependency is installed.
The helper does not create dependency aliases, symlinks, or source imports.
Files include a local `type: module` manifest and inert compatibility JSON.

### `await checkPreparedFixtures({ directory, renderTemplate, render, components })`

Pass `directory` from preparation and the functions/components from the runtime
bridge being tested. `render` is the low-level `runtime/server` facade's function;
`renderTemplate` and `components` come from the package root. Assertions cover:

- Public context access through separately compiled fixtures, the internal-server
  facade, supplied low-level render, and packaged adapters.
- Custom nested icons, arbitrary piece types, parent context, bound helpers,
  escaping, navigation recording, head markup, and injected/deduplicated CSS.
- Sequential and concurrently **scheduled synchronous** requests, reentrant
  rendering, optional navigation, defaults, duplicate navigation, and fresh
  recorder/head state after exceptions and one-shot fallback.

It validates metadata before importing any prepared fixture. Returns
`{ requestsChecked, body, head, navigation }` with a representative successful
render; `requestsChecked` counts the repeated full custom-page assertions (other
edge-case assertions run as well). The helper imports only Node builtins and the
runtime compatibility facade, so it can be copied into production proofs.

### `await prepareIsolatedFixture(root)`

Requires a new or empty caller-owned directory. Returns
`{ root, entry, packageDirectory, fixturesDirectory }`. It copies **only** runtime
`dist/` plus a generated production `package.json` (no dependencies or development
manifest) into `root/node_modules/@luzzle/web.templates`, compiles fixtures into
`root/prepared/revision/`, and copies the runtime-only checker/guard into `root`.
It does not copy source, compiler, build tools, lockfiles, or workspace links.
The verifier also scans installed package manifests, rejecting any extra package
or link escaping the isolated tree, even if that package was never imported.

```sh
node --conditions=node --conditions=production <root>/verify.mjs
```

`entry` is the absolute path to that verifier. It installs native
`node:module.registerHooks` **before dynamic runtime/fixture imports**, rejects
non-builtin/non-file URLs, and realpath-checks every resolved file against `root`.
Workspace-ancestor fallback and symlink escapes are rejected. On success stdout
is one JSON object: `{ "ok": true, "requestsChecked": ... }`. The tree is
relocatable and can be copied into an external Docker proof. Run on Node >=24.
No dev tools are needed to execute it; preparation still requires installed dev
dependencies and a built package.

**Scope:** this is an honest host copy-layout simulation. It proves isolated
native rendering of the copied runtime and catches accidental ancestor fallback.
It is **not** evidence that `pnpm deploy --prod`, production pruning, the actual
web image, mounted-volume ancestry, or the final container works. Those gates,
and the real Vite/built-server integration harness, belong to the consuming app.

## Consumer and production checks

From the repository root:

```sh
pnpm --filter @luzzle/web test:templates
docker build -f packages/web/templates/test/Dockerfile -t luzzle-templates-proof .
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges luzzle-templates-proof
```

The web check renders real prepared fixtures through the actual Vite dev server
and a standalone built Vite SSR bridge using the app's production externalization
policy and compiler options. It compares native identities for the renderer,
context helpers, and packaged components, and renders an app-owned host with a
separate context. This bridge does not replace an end-to-end SvelteKit
adapter/server smoke. The native package suite independently exercises templates,
styles, navigation, exceptions, and compatibility checks.

The container recipe prepares fixtures in the build stage, discards the helper's
copied runtime, and installs the real `pnpm deploy --prod --legacy` output in a
fresh Node image. The runtime verifier checks both native rendering and absence
of installed compiler/toolchain packages. No archive content or user config is
needed. This is a package-level proof, not verification of the final web image.
