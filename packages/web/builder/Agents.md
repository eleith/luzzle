# Agents.md for @luzzle/web.builder 🏗️

## Scope
Sidecar microservice for background build processing.

## Architecture
* **Runtime**: Node.js HTTP server (`server.js`) that orchestrates build scripts.
* **Extensibility**: Logic should favor the `pre/post-build` shell scripts for custom deployment needs.
* **Concurrency**: Strict single-build lock logic to avoid database corruption.