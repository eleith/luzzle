# @luzzle/web.worker 🛠️

The sidecar service that runs heavy publish jobs handed off by the Web Explorer.

## Why it exists 🤖

The Worker pulls jobs off a shared queue (Sidequest on SQLite) and runs the heavy work that doesn't belong inside the Explorer process:
* Syncing the piece archive to and from cloud storage (rclone).
* Parsing pieces into the luzzle db.
* Generating image variants and Open Graph PNGs.
* Pushing generated assets to a CDN.

By running as a sidecar, the Explorer stays lightweight and responsive while the Worker handles the background churn. For deployment instructions, see the Web Explorer documentation.
