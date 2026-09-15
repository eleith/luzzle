---
"@luzzle/web": patch
---

Fix the editor's kebab menu rendering behind other floating content (bits-ui was reading z-index off the wrong element) and add a "live" menu item that opens the piece's public page in a new tab when one exists. "preview" is now hidden once the draft matches what's already live, since there'd be nothing new to preview.
