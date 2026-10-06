# @luzzle/web.proxy

## 0.0.243

### Patch Changes

- 039bec5: Generate one or more metadata fields, or append to the Markdown body, directly from the source editor. Metadata generation starts with all fields selected and the field picker focused. Generation shows inline progress and applies one undoable, unsaved document update. Creation stays a simple create-and-edit flow; the separate generator page is retired.

  The core generation APIs are `generatePieceFrontmatter` and `generatePieceBody`, with `FrontmatterGenerationRequest` describing a metadata request. The CLI assistant calls `generatePieceFrontmatter` directly; the obsolete `pieceFrontMatterFromPrompt` export is removed. Command options and final-only output are unchanged.

  Allow HTTP(S) asset URLs in generated content and resolve them on Save. Preserve strict stored-piece validation. Share SSE transport without sharing generation and workflow progress screens.

- b194368: Set a five-minute Google SDK request timeout and a seven-minute Nginx read timeout for admin generation routes so SDK timeouts can display an application error instead of a gateway timeout page.

## 0.0.242

## 0.0.241

## 0.0.240

## 0.0.239

## 0.0.238

### Patch Changes

- Include @luzzle/web.proxy and @luzzle/web.lsp in the synchronized release group.
