---
"@luzzle/web": patch
---

Show the recorded Open Graph PNG in published and preview Share views instead of rendering the template again in the browser. Images fit mobile and desktop screens and open directly in a new tab when clicked. Published image URLs include the publication timestamp so republishing does not reuse a stale browser-cached image. Report missing images explicitly and remove the unused browser composition renderer and its template dependencies.
