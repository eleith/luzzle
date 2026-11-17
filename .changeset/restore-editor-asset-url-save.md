---
"@luzzle/web": patch
---

Restore HTTP(S) URL shorthand in editor asset fields on Save using the existing attachment machinery. Ordinary saves remain unchanged; URL-converting saves rewrite frontmatter with local asset paths while preserving the body. Update an unchanged editor with saved text, leave newer drafts alone, and preserve the draft when downloads fail.
