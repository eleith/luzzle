# @luzzle/web.lsp

The sidecar service that proxies luzzle lsp through a websocket

## Why it exists

The web explorer has a codemirror editor for remote editing of luzzle markdown
files. codemirror has basic support for an lsp but it needs a transport layer to
communicate to/from in order to render errors and warning in the editor.
