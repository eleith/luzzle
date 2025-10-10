# Custom Luzzle Web Explorer

This guide explains how to build and customize your Luzzle Web Explorer instance using Docker.

## New Docker Strategy

The Luzzle Web Explorer is distributed as a base Docker image. This image
contains the application's source code and necessary tools, allowing you to
extend it with your own `config.yaml` and content. This approach provides
maximum flexibility and transparency for customization.

## Getting Started

### Prerequisites

*   **Docker:** Ensure Docker is installed and running on your system.
*   **Node.js (for local development):** While not strictly required for
building Docker images, Node.js is useful for local development and testing.

### Pulling the Base Image

The official Luzzle Web Explorer base image is available at
`git.eleith.com/eleith/luzzle-explorer:${VERSION}`. You can pull it using:

```bash
docker pull git.eleith.com/eleith/luzzle-explorer:${VERSION}
```
(Replace `VERSION` with the desired version tag, e.g., `latest`).

## Using the Custom Dockerfile Example

Refer to the `Dockerfile.custom` file for a detailed guide on how to extend
this base image with your custom configurations and content.
