---
'@luzzle/web': patch
---

Keep the demo’s local icon designs, but use the generic `default` icon instead of a named design when a row falls back. For those demo types, `/api/pieces` and `/api/search` now return `templates.icon.name: default` and only the generic icon’s mapped fields. The renderer and support for explicitly selected built-in names are unchanged.

Use one standalone `content/templates/props.d.ts` from the demo to author local templates without a source checkout or installed Luzzle packages. The demo keeps the field types for its own YAML mappings in a separate `fields.d.ts`. Both files support editor completion without adding runtime dependencies.
