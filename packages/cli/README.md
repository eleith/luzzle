# @luzzle/cli 💻

A terminal companion for the human side of Luzzle. The CLI offers commands to
manage, validate, and query your piece archive directly from your terminal.

## Installation 🚀

Install the CLI globally:

```bash
npm install -g @luzzle/cli
```

## Configuration ⚙️

The CLI is configured via a YAML file. By default, it reads from the OS-specific
standard user config path. You can customize settings like storage paths, SQLite
database locations, and Gemini API keys.

For detailed options, see the [CLI Configuration Reference](./docs/config.md).

---

## Commands Reference 🛠️

All commands support a `--dry-run` flag to run without making permanent changes
to your disk or database, and a `--verbose` flag for detailed logs.

### 1. `init <dir>`

Initializes a new Luzzle repository inside the specified directory. This sets up
the database client and runs Kysely schema migrations.

```bash
luzzle init ./my-archive
```

### 2. `sync`

Scans your archive directory, parses new or updated piece files, and updates the local SQLite cache index.

- **`--force`** (`-f`): Force updates on all items, ignoring file modification times.
- **`--prune`** (`-p`): Delete orphaned assets from disk that are no longer referenced by any piece.

### 3. `create <title> [fields]`

Creates a new piece file with the proper extension and schema layout.

- **`--piece`** (`-p`): Piece type name (e.g. `books`, `films`). (Required)
- **`--directory`** (`-d`): Directory path where the piece should be created. (Required)
- **`--input`** (`-i`): Input format of the `[fields]` argument (`yaml` or `json`). Defaults to `yaml`.

### 4. `field <piece-path> [field] [value]`

Gets, edits, or removes a frontmatter field for a specific piece file.

- **`--remove`** (`-r`): Remove the specified field from the piece.

### 5. `validate <piece-path>`

Validates a specific piece file's YAML frontmatter against its registered JSON schema.

```bash
luzzle validate ./archive/books/dune.books.md
```

### 6. `assistant`

Prompts the Gemini AI assistant to generate or update piece metadata based on a natural language prompt or attached files.

- **`--prompt`**: A sentence describing the piece or where to find info. (Required)
- **`--piece`** (`-p`): Target piece type. (Required)
- **`--update`** (`-u`): Path to an existing piece to modify.
- **`--directory`** (`-d`): Folder to write a new piece file.
- **`--title`**: Title of the new piece.
- **`--file`**: Path to reference documents/images (can be specified multiple times).
