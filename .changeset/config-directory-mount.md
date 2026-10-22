---
"@luzzle/web": patch
"@luzzle/web.worker": patch
---

Mount the demo configuration directory read-only instead of bind-mounting one
file, allowing containers to observe editor atomic-save replacements. Move the
editable YAML into demo/config/config.yaml and keep compatibility symlinks so
existing commands and relative source/data/prepared paths retain their behavior.

Require a one-time image rebuild and container recreation for the layout change.
Server configuration remains cached; no watcher or general hot reload is added.
