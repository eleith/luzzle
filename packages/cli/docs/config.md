# CLI Configuration Reference ⚙️

The Luzzle CLI (`@luzzle/cli`) is configured via a YAML file.

## Configuration File Locations 📂

By default, the CLI reads and writes its configuration file from the OS-specific standard user config folder:

- **Linux:** `~/.config/@luzzle/cli/config.yaml` (or `$XDG_CONFIG_HOME`)
- **macOS:** `~/Library/Preferences/@luzzle/cli/config.yaml`
- **Windows:** `%APPDATA%\@luzzle/cli\config.yaml`

### Custom Config Path

You can override the default location for any command by passing the `--config` (or `-c`) flag:

```bash
luzzle sync --config ./my-custom-config.yaml
```

---

## Configuration Properties 🛠️

Here are the supported properties:

### 1. `storage`

Defines where your Markdown piece archive is stored.

- **`storage.type`** (enum: `['filesystem']`): The storage provider type. Defaults to `filesystem`.
- **`storage.root`** (string): The absolute or relative path to the folder containing your Markdown files. Defaults to the directory containing the config file.

### 2. `database`

Defines the SQLite database index cache.

- **`database.type`** (enum: `['sqlite']`): The database type. Defaults to `sqlite`.
- **`database.path`** (string): The path to the SQLite database file on disk. Defaults to `luzzle.sqlite` in the same directory as the config file.

### 3. `api_keys`

API credentials for auxiliary services.

- **`api_keys.google`** (string): Your Google Gemini API key. This is required if you want to use the `luzzle assistant` command to auto-generate or update piece metadata.

---

## Example Config (`config.yaml`) 📝

```yaml
storage:
  type: filesystem
  root: ./archive

database:
  type: sqlite
  path: ./data/luzzle.sqlite

api_keys:
  google: AIzaSyD...
```
