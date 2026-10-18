---
"@luzzle/web": patch
"@luzzle/web.worker": patch
"@luzzle/web.lsp": patch
---

Stop requesting host npm credentials for development Docker builds. Luzzle
packages are installed from workspace source; other dependencies use the public
npm registry. Exclude npmrc files from the build context to avoid copying local
credentials into images. Production build-secret settings are unchanged.
