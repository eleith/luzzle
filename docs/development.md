# Luzzle Development Philosophy & Standards 🛠️

So you want to hack on Luzzle? Welcome! We like text, fast SQL databases, and
robust schemas. Here is how we build things around here.

## Core Philosophy 🧠

### 1. Markdown is the Source of Truth

Never forget: the `.md` files in the archive are the absolute source of truth.
The SQLite database is a **disposable, derivative cache**. If the database gets
corrupted, deleted, or thrown into the sun, we should be able to reconstruct the
entire state in seconds just by parsing the Markdown files again.

### 2. Core-First Approach

All parsing, schema validation, and storage operations must happen within
`@luzzle/core`. Never implement low-level filesystem or piece parsing in other
packages. Keep core generic, and let other packages import and reuse its
abstractions.

### 3. Maintain High Quality

We write tests for everything.

- **Coverage Targets:** Code coverage should not go down. Always check `vitest`
reports and keep coverage at 100% (or very near it) where required.
- **CI Checks:** Before pushing or committing, ensure you get `lint`, `build`,
and `test` passing locally.

### 4. No-Commit-Until-Verified

Don't commit fixes until they are actually verified to work. Especially when
working with Docker configs, Nginx caches, and worker job runners, run them
locally, verify they perform correctly, and only then write your commit.

### 5. Keep docs relevant

After any commit, follow up with documentation updates to keep the docs fresh,
accurate and evolving in pace with codebase changes.

---

## Web Ecosystem 🌐

If you are working on the Web ecosystem (the explorer, worker, proxy, and other
web helpers), please refer to the [Web Development
Standards](../packages/web/docs/development.md) for web-specific rules.

---

## Releases 📦

Luzzle uses [Changesets](https://github.com/changesets/changesets) with fixed app grouping (`apps/web`, `packages/web/worker`, `apps/cli`, `apps/core`, `apps/lsp`) so all deployable applications stay synchronized in versioning.

1. **Document changes:** when finishing a feature or fix, record a changeset:
   ```sh
   pnpm changeset
   ```
2. **Bump versions & changelogs:** when ready to release:
   ```sh
   pnpm version:apps
   ```
   Commit the resulting version bumps and changelog updates (`git commit -m "[luzzle] release X.Y.Z"`).
3. **Tag & deploy:**
   ```sh
   pnpm tag:apps
   git push origin main --tags
   ```

