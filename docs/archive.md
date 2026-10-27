# Your archive

An archive is a folder of Markdown files, schemas and attachments. The files are
yours. SQLite is a rebuildable index, not the only copy of your notes.

Each **piece** uses `name.TYPE.md`, with a matching `.luzzle/schemas/TYPE.json`.
Types are yours to invent: books, spare parts, suspicious garden gnomes.

## Start small

Install the [CLI](cli.md#install), then make a folder:

```sh
mkdir -p my-archive/.luzzle/schemas my-archive/.assets
cd my-archive
```

Create **`.luzzle/schemas/notes.json`**:

```json
{
	"title": "notes",
	"type": "object",
	"properties": {
		"title": { "type": "string", "default": "Untitled" },
		"date_published": { "type": "string", "format": "date" },
		"attachment": { "type": "string", "format": "asset" }
	},
	"required": ["title"]
}
```

Create **`hello.notes.md`**:

```markdown
---
title: Hello
date_published: 2026-01-15
---

A first note. Nothing to migrate out of a proprietary app. A pleasant change.
```

Create **`cli.yaml`** beside it:

```yaml
storage:
  type: filesystem
database:
  type: sqlite
```

Now validate and index:

```sh
luzzle -c ./cli.yaml validate ./hello.notes.md
luzzle -c ./cli.yaml sync --verbose
```

Sync creates `luzzle.sqlite` beside the config. Run it again after editing;
it is not a watcher. Schema filename, schema `title`, and piece suffix must agree.
Put schemas directly in `.luzzle/schemas/`; pieces can live in subfolders.

## Attach a file

```sh
luzzle -c ./cli.yaml attach ./hello.notes.md /path/to/manual.pdf
```

This copies the file into `.assets/` and prints its path. Add that path to the
piece's `attachment` field, then validate and sync. `attach` does not edit the note.
A schema field with `format: asset` makes the reference trackable.

**Back up before using `sync --prune`.** It deletes unreferenced assets;
a Markdown link alone is not a tracked attachment reference.

Add schema properties for metadata you want indexed. Extra YAML fields can stay
in the file without appearing in SQLite. Custom string formats include `asset`,
`date`, `comma-separated`, `paragraph` and `markdown`.

Next: [CLI commands](cli.md), [editor support](lsp.md), or [web setup](web/README.md).
