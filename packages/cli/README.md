# @luzzle/cli

The command-line interface for Luzzle.

## Overview

The Luzzle CLI aids in creating new pieces, validating data against schemas, and
managing assets. It automates tasks that would otherwise require manual file
manipulation.

## Usage

Install globally or use via `npx`:

```bash
npm install -g @luzzle/cli
```

### Common Commands

* **Initialize:** `luzzle init`
* **Create Piece:** `luzzle piece add book --title "The Hobbit"`
* **Validate:** `luzzle validate /path/to/the-hobbit.book.md`

## Features

* **Schema-Aware:** Uses `.luzzle/schema/*.json` definitions for field prompting.
* **Asset Handling:** Organizes attachments in the `.assets` directory.

### Configuration

Configuration is managed via `luzzle config`.

#### Managing Config

* **View Configuration:** `luzzle config`
* **Get a Value:** `luzzle config storage.type`
* **Set a Value:** `luzzle config storage.type filesystem`
* **Remove a Value:** `luzzle config --remove api_keys.google`

#### Configuration Options

The YAML configuration supports:

* **storage:**
  * `type`: `filesystem` (default) or `webdav`.
  * `root`: Root directory for files.
  * `options`: Storage-specific options.
* **database:**
  * `type`: `sqlite` (only supported type).
  * `path`: Path to SQLite file.
* **api_keys:**
  * `google`: API key for AI features.

