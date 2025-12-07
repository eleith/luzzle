# Custom Luzzle Web Explorer

Guide to building and customizing a Luzzle Web Explorer instance using Docker.

## Docker Strategy

The Web Explorer is distributed as a base Docker image containing source code and
tools. You extend it with your own `config.yaml` and content.

## Getting Started

### Prerequisites

- **Docker:** Installed and running.
- **Node.js:** Optional, for local development.

### Pulling the Base Image

Pull the image from the registry:

```bash
docker pull git.eleith.com/eleith/luzzle-explorer:${VERSION}
```

## Using the Custom Dockerfile Example

Refer to `Dockerfile.custom` for details on extending the base image.
