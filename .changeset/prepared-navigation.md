---
"@luzzle/web": patch
---

Add the page-only helpers.showNavBanner(colors?) API for prepared server templates.
No call means no banner; calling without arguments uses application defaults.
Authors can override background, text and hover colors using request data while
web retains the real banner, its placement and browser behavior.

Verify initial-response HTML, metadata and delivered banner CSS in the built SSR
fixture. Production page cutover and icon-helper integration remain separate work.
