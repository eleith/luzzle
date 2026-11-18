---
"@luzzle/web": patch
---

Give each mounted editor its own language-assistance connection, await initialization before attaching it, and close pending connections when navigating away. Retry once automatically, provide a local Retry action after failure, and reconnect using the current unsaved buffer without recreating the editor or changing Save behavior.
