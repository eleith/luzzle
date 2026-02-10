# Luzzle Web Explorer 🔎

A responsive web manager for your Luzzle archives.

## Quick Start 🚀

The fastest way to get Luzzle running is via Docker Compose. This will spin up
the Explorer, the Builder and the Proxy.

1: Clone & Prepare

```bash
 # Copy the sample archive to get started
 cp -r sample archive
```

2: Up

```bash
docker-compose up
```

3: Browse

Open [http://localhost:8080](http://localhost:8080) in your browser.

## Features ✨

- **Fast**: A modern, responsive interface for browsing your records.
- **Integrated Editor**: Edit your pieces and manage assets directly in the
  browser. ✏️
- **AI Assistance**: Automatically generate metadata from your content using
  Gemini. 🤖
- **Zero Config**: Sensible defaults allow you to see your data immediately. 🧩
- **Themable**: Fully customizable colors and fonts via configuration. 🎨

## Configuration ⚙️

While Luzzle works out of the box with defaults, you can customize everything
from authentication to themes in your `config.yaml`.

For a full list of options, see the [Configuration Reference](docs/config.md).

## Deployment 🏗️

In production, you'll want to provide a few environment variables to secure your
instance:

- `LUZZLE_AUTH_SECRET`: A random string for session encryption.
- `LUZZLE_BUILDER_TOKEN`: A secret token to authenticate the builder sidecar.
- `LUZZLE_AUTH_USERNAME` / `LUZZLE_AUTH_PASSWORD`: If using credential-based
  auth.

Check the `docker-compose.yml` for a complete list of supported environment
variables.
