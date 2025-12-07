# @luzzle/cli

The trusty command-line companion for Luzzle. 🛠️

## Overview

The Luzzle CLI handles the mundane tasks—like validating schemas and organizing
assets—so you can focus on the fun part: hoarding data. 🗄️

It streamlines the creation of new pieces and ensures everything in your archive
is neat and tidy.

## Usage

You can install it globally (live dangerously) or just run it via `npx`.

```bash
npm install -g @luzzle/cli
```

*(Installation usually takes a few seconds. Just enough time for a sip of
water. 💧)*

### Common Commands

* **Initialize:** `luzzle init`
* **Create Piece:** `luzzle piece add book --title "The Hobbit"`
* **Validate:** `luzzle validate`

## Features

* **Schema-Aware:** Uses your `.luzzle` definitions to prompt for the right
  fields. Smart! 🧠
* **Asset Handling:** Automatically organizes images into `.assets`.

### Configuration

The CLI supports a configuration file to manage settings.

#### Managing Config

* **View Configuration:** `luzzle config`
* **Get a Value:** `luzzle config storage.type`
* **Set a Value:** `luzzle config storage.type filesystem`
* **Remove a Value:** `luzzle config --remove api_keys.google`

#### Configuration Options

The YAML configuration supports:

* **storage:** `filesystem` (default) or `webdav`.
* **database:** `sqlite` (the only one you need).
* **api_keys:** For when you need a little AI help. 🤖