# @luzzle/web

## 0.0.242

### Patch Changes

- b6d238a: Fix keyboard navigation in the create form's directory/type combobox: arrow keys stopped working after typing a filter letter, caused by an upstream bits-ui bug (fixed in 2.19.1) where custom item filtering desynced the internal highlighted-item tracking. Also disable the input's browser autocomplete, which was competing with the combobox's own accessible listbox for arrow-key/Enter handling.
- 0ccbcb6: Fix the editor's kebab menu rendering behind other floating content (bits-ui was reading z-index off the wrong element) and add a "live" menu item that opens the piece's public page in a new tab when one exists. "preview" is now hidden once the draft matches what's already live, since there'd be nothing new to preview.
- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.241

### Patch Changes

- fc467ac: Add an admin dashboard (`/admin`, replacing the old redirect to the create form) showing piece/asset stats, recently-edited pieces, and setup status, plus an `/admin/health` page with live checks (storage, worker, auth issuer, archive/cdn sync, AI key) that can each be re-run on demand. Archive/cdn checks run through a new `TestConnectivity` worker workflow since the web app has no rclone binary or credentials of its own.
- 12a291b: Replace the hardcoded ▼ arrow in the `Combobox` component and the search dialog's type `Select` with a shared `ph:caret-up-down` icon, and fix the combobox trigger button only showing the currently selected item instead of the full list.
- 28082fb: Replace the directory and type dropdowns on the piece create form with a searchable combobox (new shared `Combobox` component built on bits-ui), so directories and types can be filtered by typing instead of scrolling a plain select.
- f5940ed: Fix an intermittent bug where saving a newly generated/created piece and being redirected back to its source editor could show stale pre-save content (edits appeared lost, though they were saved correctly). Caused by SvelteKit reusing a hover-preloaded page fetched before the save completed; `invalidateAll()` is now called before navigating away on save.
- a75fe89: Manage local dev secrets and docker compose tasks with mise + fnox instead of a plain `.env` file, so dev credentials have safe placeholder defaults committed alongside the config.
- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.240

### Patch Changes

- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.239

### Patch Changes

- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.238

### Patch Changes

- Include @luzzle/web.proxy and @luzzle/web.lsp in the synchronized release group.
- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.237

### Patch Changes

- Fix Woodpecker CI YAML parsing for tag version extraction.
- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1

## 0.0.236

### Patch Changes

- 66f2919: Add support for configurable OIDC provider name (defaulting to "Single Sign-On"), state verification checks in OIDC provider, and updated signin page UI.
- @luzzle/web.db@0.0.1
  - @luzzle/web.pieces@0.0.1
