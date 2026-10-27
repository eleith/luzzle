# Development

Make a small change. Make it work. Stop there.

## Set up

Use Node.js 26 and pnpm 11.2.2, matching the repository toolchain.

```sh
pnpm install --frozen-lockfile
pnpm build
```

For the browser app and worker, follow [web development](web/development.md).

## Before committing

Run the checks for the packages you changed. From the repository root, these run
across the workspace:

```sh
pnpm test
pnpm check
pnpm lint
pnpm build
```

Keep coverage from dropping. If you change Docker or publishing, exercise that
path too. A passing unit test is not a running container.

## Keep it boring

- Markdown is the source of truth. SQLite is a rebuildable index.
- Put archive parsing and storage logic in `@luzzle/core`, not another copy in an app.
- Leave expensive asset generation to the worker.
- Keep changes focused. Don't commit fixes you haven't verified.
- User guides live in `docs/`. Package READMEs are signposts, not implementation diaries.

## Releases

Runtime changes need a changeset; documentation-only changes don't.

```sh
pnpm changeset
```

When preparing a release:

```sh
pnpm version:apps
pnpm tag:apps
```

Deployable apps share a release version. Commit and push the version changes, then
push release tags individually; bulk tag pushes can skip GitHub workflows.
