# @luzzle/web.lsp 💂

The sidecar service that proxies Luzzle LSP through a WebSocket connection.

## Why it exists 🗣️

The Luzzle Web Explorer features a browser-based CodeMirror editor for editing
your digital garden Markdown files. While CodeMirror supports autocompletion and
diagnostic warnings, it requires a transport layer to communicate with the LSP
server.

This package bridges standard stdio LSP communications to a WebSocket
connection, enabling rich syntax diagnostics, schema-aware validations, and
autocompletion directly inside the web browser.

---

## Operations 🛠️

This service runs inside the `luzzle-lsp` container. For full details on the
container environment, check out the [Web Stack Deployment
Guide](../docs/deployment.md).
