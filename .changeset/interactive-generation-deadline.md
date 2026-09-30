---
'@luzzle/core': patch
'@luzzle/web': patch
'@luzzle/web.proxy': patch
---

Set a five-minute Google SDK request timeout and a seven-minute Nginx read timeout for admin generation routes so SDK timeouts can display an application error instead of a gateway timeout page.
