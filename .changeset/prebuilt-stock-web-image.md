---
"@luzzle/web": patch
---

Build and deploy the stock web application during image production, then launch
the pruned Node runtime through its YAML-aware bootstrap without a startup build.
Keep development tooling separate and retire the custom-building demo Dockerfile.
