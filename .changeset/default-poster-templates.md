---
"@luzzle/web": patch
"@luzzle/web.worker": patch
---

Use independent poster-style defaults for all piece icons, pages and Open Graph
cards. Select normal Svelte components from internal catalogs, with mapped fields
prepared server-side for published content and previews.

The worker compiles shipped OG templates on first use and caches the result.
Remove custom piece source paths and prepared piece-page orchestration; migrate
the demo to field mappings. Site/feed source customization remains for its later cutover.
