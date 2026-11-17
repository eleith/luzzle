---
"@luzzle/web": patch
---

Load only the icon templates used by the mixed all-pieces index and the home page's latest/random collections in the browser, while preserving server-rendered titles, links, pagination, and home Markdown. Reserve card space so icons can load without shifting surrounding content. Show a small, static puzzle-piece placeholder until each icon loads. Search, type-specific listings, and individual public piece pages retain their server-rendered designs.
