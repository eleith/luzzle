---
"@luzzle/core": patch
"@luzzle/cli": patch
"@luzzle/web": patch
"@luzzle/web.proxy": patch
---

Generate one or more metadata fields, or append to the Markdown body, directly from the source editor. Metadata generation starts with all fields selected and the field picker focused. Generation shows inline progress and applies one undoable, unsaved document update. Creation stays a simple create-and-edit flow; the separate generator page is retired.

The core generation APIs are `generatePieceFrontmatter` and `generatePieceBody`, with `FrontmatterGenerationRequest` describing a metadata request. The CLI assistant calls `generatePieceFrontmatter` directly; the obsolete `pieceFrontMatterFromPrompt` export is removed. Command options and final-only output are unchanged.

Allow HTTP(S) asset URLs in generated content and resolve them on Save. Preserve strict stored-piece validation. Share SSE transport without sharing generation and workflow progress screens.
