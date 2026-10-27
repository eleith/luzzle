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
pieces. Save edits, preview them, then use `/admin/publish` to check changes and
publish. Saving a file is not the same as publishing it.

Source and text-asset editors start with Standard keybindings. Press
**Ctrl+Alt+V** while focused to toggle Vim mode; the browser remembers your choice.
Use the Save button: Vim save/quit commands do not trigger application actions.
If Vimium steals Escape, exclude the editor URLs in Vimium with an empty
excluded-keys field.
