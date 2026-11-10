# Luzzle on the web

Browse your archive, edit pieces, and publish them for other people to wander
through. Your Markdown stays yours. The web stack just gives it a front door.

- [Deployment](deployment.md) — start the published Docker images.
- [Configuration](config.md) — set up your site, storage, and sign-in.
- [Templates](templates.md) — choose how pieces look and map your metadata.
- [Development](development.md) — work on the web stack from a checkout.

New to the files underneath? Start with [archives](../archive.md) or the
[CLI guide](../cli.md).

## Using the editor

With [authentication configured](config.md#sign-in), open `/admin` to manage
pieces. **Save** validates and writes exactly your editor text, without formatting,
rewriting asset URLs, or reloading the editor. **Saved** means the file is saved, not
published. **Publish** requires a saved editor and publishes only that piece. You can keep
typing and saving while it runs.

The editor's bottom status bar shows one short description on the right, such as
**Up to date**, **Unsaved**, **Saved changes**, or **Unpublished**.
This uses the existing saved-Markdown comparison; it does not track changes to
attachment bytes, templates, or the renderer.

**More** groups publication, viewing, editor settings, and destructive actions.
On phones the same **More** button opens a text-only bottom sheet with editor colors and the search dialog's spacing and motion.
**Format** formats the current buffer, including frontmatter. It is undoable and does
not save; use **Save** when ready. Use **Attach** to download or upload assets explicitly.
**Preview** always generates a fresh preview of the saved file; save your edits first.
**View published** opens the existing public version's Overview.

When saved Markdown has unpublished changes, Published Overview adds a **Preview**
row to the Publication table. Its **Generate** action creates a fresh preview
of the saved file without changing the publication. The Preview table adds a
**Publication → View published** row when a public version exists. Failed or expired
previews add a **Preview → Generate fresh preview** row;
this starts a new job from saved content rather than reusing the old preview.

When saved Markdown matches the publication, the toolbar is quieter. **Publish**
remains available in **More** to regenerate unchanged Markdown after attachment,
template, or renderer changes.

Use `/admin/publish` to check and publish archive changes. Check lists all pending changes. Choose which added or updated pieces to publish.
Publishing reads saved files when the worker runs, so edits saved after Check or
while the job is waiting may be included. Unselected edits stay pending.

**Publishing from this screen also applies all pending removals**, regardless of
selection. They are listed separately; you can apply removals without selecting any pieces.
Schema changes also apply globally. A renamed file looks like a removal and an
addition: the old public version can disappear before you select its replacement.
Check alone does not change the public site.

Publish and Preview show each step's logs directly. The header contains the step
name and status; the footer shows line count, elapsed seconds and a compact auto-scroll lock.
Scroll up to stop following new output, or lock auto-scroll to return to the latest lines.

Source and text-asset editors default to Standard keybindings. Toggle **Vim mode**
in the piece editor's **More** menu; the browser remembers your choice.
The piece editor's bottom bar shows the active Vim mode on the left and publication
status on the right.
Vim's `:w` and `:wq` use the same Save action as the button, including its busy and
error handling. Both save and stay in the editor; neither publishes or navigates away.
Vim command prompts, searches and messages temporarily replace the normal bottom-bar
contents instead of adding another row.

Useful Vim commands include `/text` and `?text` for search, `n`/`N` for matches,
`:42` to jump to a line, `:%s/old/new/g` for replacement, `:sort`, `:noh` to clear
search highlighting, and `:undo`/`:redo`. `:marks` and `:reg` show marks and registers.
This is a browser Vim emulation, not a shell or a full file/window manager.
If Vimium steals Escape, exclude the editor URLs in Vimium with an empty
excluded-keys field.
