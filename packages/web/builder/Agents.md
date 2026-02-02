# Agents.md for @luzzle/web.builder

Instructions for agents working on the `@luzzle/web.builder` package.

## Scope

The Builder is a sidecar service responsible for the asynchronous regeneration of the Luzzle Web Explorer's backing data (database indices and static assets). It ensures the main web application remains performant by offloading CPU-intensive tasks.

## Architecture

*   **Runtime:** Node.js `http` server (`server.js`) that spawns child processes.
*   **Orchestration:** Executes shell scripts in `scripts/` which utilize the `@luzzle/web.tools` CLI.
*   **Environment:** Docker container with heavy dependencies pre-installed (e.g., Google Chrome for Puppeteer, rclone).

## Key Concepts

*   **Concurrency Control:** The server enforces a strict lock (`isDeploying`) to prevent concurrent builds. This is critical to avoid database corruption or inconsistent states during incremental updates.
*   **Volume Sharing:** Relies on shared file system access (Docker volumes) to read the configuration/archive and write to the SQLite database and asset directories. The following paths are critical:
    *   `/app/config.yaml`: Configuration source of truth.
    *   `/app/data/luzzle.sqlite`: Target database for indexing and web tables.
    *   `/app/assets`: Target directory for generated images and assets.
    *   `/app/archive`: Source of truth for Markdown content.
*   **Webhook Interface:** Exposes a single endpoint (`POST /hooks/build`) secured by a token. It streams stdout/stderr back to the client.

## Files

*   `server.js`: The entry point. Handles auth, concurrency locking, and process spawning.
*   `scripts/build.sh`: The main pipeline script. Runs `pre-build` -> `tools` -> `post-build`.
*   `Dockerfile`: Installs `@luzzle/web.tools`, Chrome, and system dependencies.

## Development

*   **Testing:** Since this is a specialized environment, testing usually involves running the container and triggering the webhook.
*   **Modifying Pipeline:** Changes to the build logic should be made in `scripts/build.sh`.
*   **Dependencies:** If new system tools are needed (e.g., for image processing), add them to the `Dockerfile`.
