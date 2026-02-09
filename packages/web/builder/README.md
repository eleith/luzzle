# @luzzle/web.builder 🏗️

The sidecar service that handles the heavy lifting for web deployments.

## Why it exists 🤖

The Builder offloads CPU-intensive tasks from the main Web Explorer, such as:
* Re-indexing the database when files change.
* Generating and optimizing web assets.
* Processing Open Graph images using Headless Chrome.

By running as a sidecar, it ensures the Explorer remains snappy while the Builder handles the background churn. For deployment instructions, see the Web Explorer documentation.