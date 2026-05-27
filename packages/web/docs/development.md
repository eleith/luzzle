# Luzzle Web Ecosystem Development Standards 🌐

Building on top of Luzzle's general development principles, the web stack has
additional rules to keep the explorer fast and the user interface highly
consistent.

## Web-Specific Rules 🏗️

### 1. Offload Heavy Work to the Sidequest Worker

The SvelteKit Web Explorer (`@luzzle/web`) must stay lightweight and responsive.
Do not run blocking or heavy asynchronous operations (e.g. syncing piece
archives to cloud storage, generating image variants, generating Open Graph
cards, parsing pieces in bulk) in the main explorer process.

- Queue jobs using **Sidequest** and implement their processing steps inside the
sidecar worker (`@luzzle/web.worker`).

### 2. Shared Web Packages are Internal-Only

The helper packages prefixed with `@luzzle/web.` under `packages/web/`
(`config`, `theme`, `db`, `pieces`, `jobs`) are local workspace packages. They
exist to share logic between `@luzzle/web` and `@luzzle/web.worker` without
duplicating code.

- Do not publish these helper packages to npm.
- Always manage their imports via pnpm workspace link references
(`workspace:*`).

### 3. Leverage Theme Styles for CSS Consistency

To ensure robust dark-mode support and custom configuration, never hardcode
colors, margins, fonts, or padding values.

- Use the CSS variables defined in `@luzzle/web.theme` (configured under `theme`
inside `config.yaml`).
- Leverage global tokens (e.g. `--color-primary`, `--space-4`,
`--radius-medium`) to keep the user interface consistent and theme-aware.
