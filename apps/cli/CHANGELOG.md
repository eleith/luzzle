# @luzzle/cli

## 0.0.243

### Patch Changes

- 039bec5: Generate one or more metadata fields, or append to the Markdown body, directly from the source editor. Metadata generation starts with all fields selected and the field picker focused. Generation shows inline progress and applies one undoable, unsaved document update. Creation stays a simple create-and-edit flow; the separate generator page is retired.

  The core generation APIs are `generatePieceFrontmatter` and `generatePieceBody`, with `FrontmatterGenerationRequest` describing a metadata request. The CLI assistant calls `generatePieceFrontmatter` directly; the obsolete `pieceFrontMatterFromPrompt` export is removed. Command options and final-only output are unchanged.

  Allow HTTP(S) asset URLs in generated content and resolve them on Save. Preserve strict stored-piece validation. Share SSE transport without sharing generation and workflow progress screens.

- a12e8bd: Require HTTP(S) URLs for asset source strings while keeping existing `.assets/...` field references unchanged. Local files must now be opened by the caller and passed as streams; CLI attach continues to accept local paths by opening them explicitly.
- ace30b0: Avoid logging full asset download URLs or upstream error messages in core and CLI diagnostics. Log the source origin instead.
- Updated dependencies [f1cf0d8]
- Updated dependencies [cb3d3b7]
- Updated dependencies [be8fb0f]
- Updated dependencies [1eec1d9]
- Updated dependencies [039bec5]
- Updated dependencies [a12e8bd]
- Updated dependencies [981f629]
- Updated dependencies [b194368]
- Updated dependencies [ace30b0]
- Updated dependencies [31e8716]
- Updated dependencies [d537423]
- Updated dependencies [a6e0f1f]
- Updated dependencies [dcf61ba]
- Updated dependencies [911a261]
  - @luzzle/core@0.0.243

## 0.0.242

### Patch Changes

- @luzzle/core@0.0.242

## 0.0.241

### Patch Changes

- Updated dependencies [fc467ac]
  - @luzzle/core@0.0.241

## 0.0.240

### Patch Changes

- @luzzle/core@0.0.240

## 0.0.239

### Patch Changes

- @luzzle/core@0.0.239

## 0.0.238

### Patch Changes

- @luzzle/core@0.0.238

## 0.0.237

### Patch Changes

- @luzzle/core@0.0.237

## 0.0.236

### Patch Changes

- @luzzle/core@0.0.236
