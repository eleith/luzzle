# CLI

Create pieces, edit metadata and update SQLite from a terminal. No web stack needed.

## Install

Use Node.js 24 or newer:

```sh
npm install -g @luzzle/cli
luzzle --help
```

## A first run

Make the files in the [archive starter](archive.md#start-small). From that folder:

```sh
luzzle -c ./cli.yaml validate ./hello.notes.md
luzzle -c ./cli.yaml sync --verbose
```

Keep passing `-c ./cli.yaml`: the CLI does not automatically find project config.
See [configuration](cli/config.md) for paths and defaults. `init <dir>` initializes
the database; it does not create an archive or its schemas. Sync initializes the
index too, so a separate `init` is optional here.

## Everyday commands

With the starter's `notes` schema:

```sh
luzzle -c ./cli.yaml create "Second note" --piece notes --directory .
luzzle -c ./cli.yaml field ./second-note.notes.md title "Second note"
luzzle -c ./cli.yaml validate ./second-note.notes.md
luzzle -c ./cli.yaml sync --verbose
```

`create` takes the filename from your title, but metadata starts from schema
defaults/examples. Edit the body in your editor. Use `field PATH FIELD` to read
one value, or add `--remove` to remove an optional field.

`sync --force` re-indexes files regardless of modification times.
`sync --prune` **deletes unreferenced assets**. Back up first; see
[attachments](archive.md#attach-a-file).

For attachments, use `attach PIECE FILE-OR-URL`. It prints a path to add to the
piece; it does not update frontmatter for you.

## Help and surprises

- `luzzle COMMAND --help` lists that command's flags.
- `--verbose` shows informational logs; successful commands can otherwise be quiet.
- `--dry-run` is **not a read-only guarantee**: SQLite may be initialized and
  asset operations can still write. The assistant does not honor this flag.
- Read validation output, not just the exit status; validation failures are logged.

The optional `assistant` command sends your prompt, schema and supplied files to
Google Gemini. Set `api_keys.google` in [config](cli/config.md), then use
`luzzle assistant --help`. Review what you send and what comes back.
