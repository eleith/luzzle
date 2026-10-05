# @luzzle/web 🔎

The SvelteKit application for browsing, searching, and editing your Luzzle
archives in a responsive web manager interface.

## Editor Keybindings

Source and text-asset editors default to Standard keybindings. Press
**Ctrl+Alt+V** while the editor is focused to toggle Vim keybindings. The choice
is remembered in this browser and reused when opening another editor.

A small editor footer shows Standard or the current Vim mode, alongside the
shortcut hint. It is informational; Ctrl+Alt+V remains the only toggle. Save
continues to use the existing Save button; Vim Save/quit commands are not connected
to application actions. Before applying generated content, the editor finishes Vim's current
insertion and returns to Normal mode, keeping generation outside dot-repeat.

If Vimium is installed, exclude the editor URLs in its settings and leave the
excluded-keys field empty. Vimium otherwise intercepts Escape before the editor
can return to Normal mode.

## Centralized Web Documentation 📖

All documentation, including deployment references, configuration setups, and
styling/development standards, has been consolidated:

- **Web Development Standards:** Read
  [packages/web/docs/development.md](../../packages/web/docs/development.md) for style and
  architecture rules.
- **Deployment Reference:** Read
  [packages/web/docs/deployment.md](../../packages/web/docs/deployment.md) for how the Explorer
  runs inside Docker alongside sidecars (Worker, LSP, Proxy).
- **Configuration Reference:** Read
  [packages/web/docs/config.md](../../packages/web/docs/config.md) for settings inside
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
