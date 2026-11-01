---
"@luzzle/web": patch
"@luzzle/web.config": patch
---

Add independently configurable Markdown bodies and recovery links for 404,
remaining 4xx, and server-error pages through native SvelteKit error handling.
Keep statuses, API responses and healthy pages unchanged, with safe built-in
fallbacks when selected Markdown is unavailable.
