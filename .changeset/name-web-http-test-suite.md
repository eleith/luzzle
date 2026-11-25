---
'@luzzle/web': patch
---

Rename the web integration test command from `test:templates` to `test:http` to describe how it checks the built application. CI still reuses the production app build for browser tests.
