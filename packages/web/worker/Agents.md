# Agents.md for @luzzle/web.worker 🛠️

## Scope
Sidecar service that runs heavy publish jobs off a shared queue.

## Architecture
* **Runtime**: Node.js process. The package will host a Sidequest engine that polls a shared SQLite-backed queue and dispatches handlers.
* **Job types** (to land in subsequent commits): `publish` (orchestrator), `archive.sync`, `luzzle.sync`, `web.sync`, `assets.generate`, `cdn.sync`, `cache.purge`.
* **Dependencies**: depends only on `@luzzle/core` and `@luzzle/web.config` (plus the heavy worker-only deps: `sharp`, `sidequest`, `takumi`).
* **Concurrency**: Sidequest is configured with `maxConcurrency: 1` so jobs run sequentially.

## Status
This is a scaffold commit — directory shape, build tooling, Dockerfiles, and a placeholder `/health` server. Job handlers and queue bootstrap arrive in following commits.
