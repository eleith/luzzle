# @luzzle/cli

A command-line companion for managing your Luzzle archive.

## Overview

The Luzzle CLI provides a set of tools to interact with your personal archive
without leaving the terminal. It streamlines the creation of new pieces,
validates your data against your schemas, and manages assets.

Please note, this tool is not a requirement. The luzzle specificiation is small
and files could always be edited by hand. This tool mostly enables automations
by piping them with other unix tools.

## Usage

You can run the CLI using `npx` or by installing it globally.

```bash
npm install -g @luzzle/cli
```

### Common Commands

* **Initialize:** Set up a new Luzzle archive.
    `luzzle init`
* **Create Piece:** Add a new book, film, or other item.
    `luzzle piece add book --title "The Hobbit"`
* **Validate:** Ensure all your files match their schemas.
    `luzzle validate`

## Key Features

* **Schema-Aware:** Reads your `.luzzle` definitions to prompt for the right
    fields.
* **Asset Handling:** Automatically organizes images and attachments into the
    `.assets` directory.

### Configuration

The CLI supports a configuration file to manage settings such as storage paths, database options, and API keys. You can manage these settings using the `luzzle config` command.

#### Managing Config

* **View Configuration:**
    `luzzle config`
    Displays the current configuration and the path to the config file.

* **Get a Value:**
    `luzzle config [field]`
    Example: `luzzle config storage.type`

* **Set a Value:**
    `luzzle config [field] [value]`
    Example: `luzzle config storage.type filesystem`

* **Remove a Value:**
    `luzzle config --remove [field]`
    Example: `luzzle config --remove api_keys.google`

#### Configuration Options

The configuration file (YAML) supports the following structure:

* **storage:**
    * `type`: The storage backend to use. Options: `filesystem` (default), `webdav`.
    * `root`: The root directory for your Luzzle files. Defaults to the directory of the config file.
    * `options`: Specific options for the chosen storage type (e.g., `url`, `username`, `password` for WebDAV).
* **database:**
    * `type`: The database type. Currently supports `sqlite`.
    * `path`: Path to the SQLite database file. Defaults to `luzzle.sqlite` in the config directory.
* **api_keys:**
    * `google`: API key for Google services (used for AI features).

