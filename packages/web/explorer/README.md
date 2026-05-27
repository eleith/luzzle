# @luzzle/web 🔎

The SvelteKit application for browsing, searching, and editing your Luzzle
archives in a responsive web manager interface.

## Centralized Web Documentation 📖

All documentation, including deployment references, configuration setups, and
styling/development standards, has been consolidated:

- **Web Development Standards:** Read
  [packages/web/docs/development.md](../docs/development.md) for style and
  architecture rules.
- **Deployment Reference:** Read
  [packages/web/docs/deployment.md](../docs/deployment.md) for how the Explorer
  runs inside Docker alongside sidecars (Worker, LSP, Proxy).
- **Configuration Reference:** Read
  [packages/web/docs/config.md](../docs/config.md) for settings inside
  `config.yaml`.

---

## Quick Start 🚀

The fastest way to test out the Explorer locally is via Docker Compose. The
`demo/` folder contains a ready-to-run environment with sample data.

1. **Start the containers:**

   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

2. **Access the frontend:**
   Open [http://localhost:8080](http://localhost:8080) in your browser.
