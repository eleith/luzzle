# CLI configuration

Pass a YAML file with `luzzle -c ./cli.yaml ...`. The CLI does not search parent
directories for project config.

## Start here

Put this at the root of your archive:

```yaml
storage:
  type: filesystem
database:
  type: sqlite
```

Omitted paths use the config file's directory. Explicit relative paths instead
use your terminal's working directory. Prefer absolute paths for custom layouts.
The archive and the database's parent directory must already exist.

| Setting           | Default                       | Purpose                                      |
| ----------------- | ----------------------------- | -------------------------------------------- |
| `storage.type`    | `filesystem`                  | Local files; the supported storage provider. |
| `storage.root`    | Config directory              | Your archive.                                |
| `database.type`   | `sqlite`                      | The supported database type.                 |
| `database.path`   | `luzzle.sqlite` beside config | The derived index.                           |
| `api_keys.google` | Unset                         | Optional Gemini assistant key.               |

YAML values do not expand `~`, `$HOME` or `${VARIABLE}`. There are no environment
overrides for these settings; write the values in YAML. Keep secrets out of Git.

## Inspect or change

```sh
luzzle -c ./cli.yaml config path
luzzle -c ./cli.yaml config storage.root
luzzle -c ./cli.yaml config storage.root /absolute/path/to/archive
luzzle -c ./cli.yaml config api_keys.google --remove
```

`config path` prints the selected filename. Plain `config` prints all settings,
including API keys. Not a great screenshot.

Even config inspection can open and migrate SQLite. If storage is broken, edit
the YAML directly before trying again.

## Without `-c`

The user-level config lives at:

- Linux: `$XDG_CONFIG_HOME/@luzzle/cli/config.yaml`, normally
  `~/.config/@luzzle/cli/config.yaml`.
- macOS: `~/Library/Preferences/@luzzle/cli/config.yaml`.
- Windows: `%APPDATA%\@luzzle\cli\Config\config.yaml`.

Back to [CLI use](../cli.md).
