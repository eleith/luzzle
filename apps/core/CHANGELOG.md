# @luzzle/core

## 0.0.243

### Patch Changes

- f1cf0d8: Prevent concurrent asset uploads from overwriting each other. If another upload creates the chosen filename first, fail safely instead of replacing that asset.
- cb3d3b7: Convert nonblank finite numeric strings to numbers when setting number fields, and reject invalid numeric inputs before writing.
- be8fb0f: Compile piece schemas when constructing a piece so invalid schemas fail before generating or writing it.
- 1eec1d9: Create missing parent directories when writing a valid piece, so callers can write into new archive subdirectories.
- 039bec5: Generate one or more metadata fields, or append to the Markdown body, directly from the source editor. Metadata generation starts with all fields selected and the field picker focused. Generation shows inline progress and applies one undoable, unsaved document update. Creation stays a simple create-and-edit flow; the separate generator page is retired.

  The core generation APIs are `generatePieceFrontmatter` and `generatePieceBody`, with `FrontmatterGenerationRequest` describing a metadata request. The CLI assistant calls `generatePieceFrontmatter` directly; the obsolete `pieceFrontMatterFromPrompt` export is removed. Command options and final-only output are unchanged.

  Allow HTTP(S) asset URLs in generated content and resolve them on Save. Preserve strict stored-piece validation. Share SSE transport without sharing generation and workflow progress screens.

- a12e8bd: Require HTTP(S) URLs for asset source strings while keeping existing `.assets/...` field references unchanged. Local files must now be opened by the caller and passed as streams; CLI attach continues to accept local paths by opening them explicitly.
- 981f629: Use a deterministic, short hash as the filename slug when a piece title cannot be slugified.
- b194368: Set a five-minute Google SDK request timeout and a seven-minute Nginx read timeout for admin generation routes so SDK timeouts can display an application error instead of a gateway timeout page.
- ace30b0: Avoid logging full asset download URLs or upstream error messages in core and CLI diagnostics. Log the source origin instead.
- 31e8716: Replace existing array fields when setting them, including when passed a scalar or an empty array, instead of appending values.
- d537423: Remove a redundant condition from generated frontmatter null filtering while preserving schema-permitted empty strings.
- a6e0f1f: Convert only unambiguous boolean and integer inputs when setting fields, and propagate field-setting failures to callers.
- dcf61ba: Mark piece filename collisions with the standard `EEXIST` error code so callers can retry without parsing an error message.
- 911a261: Validate generated frontmatter against its requested schema before returning it, and report descriptive errors for invalid model output.

## 0.0.242

## 0.0.241

### Patch Changes

- fc467ac: Add an admin dashboard (`/admin`, replacing the old redirect to the create form) showing piece/asset stats, recently-edited pieces, and setup status, plus an `/admin/health` page with live checks (storage, worker, auth issuer, archive/cdn sync, AI key) that can each be re-run on demand. Archive/cdn checks run through a new `TestConnectivity` worker workflow since the web app has no rclone binary or credentials of its own.

## 0.0.240

## 0.0.239

## 0.0.238

## 0.0.237

## 0.0.236
