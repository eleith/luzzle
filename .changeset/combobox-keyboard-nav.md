---
"@luzzle/web": patch
---

Fix keyboard navigation in the create form's directory/type combobox: arrow keys stopped working after typing a filter letter, caused by an upstream bits-ui bug (fixed in 2.19.1) where custom item filtering desynced the internal highlighted-item tracking. Also disable the input's browser autocomplete, which was competing with the combobox's own accessible listbox for arrow-key/Enter handling.
