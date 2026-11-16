---
"@luzzle/web": patch
---

Use dedicated routes for public page templates so SvelteKit selects their assets while preserving public URLs and runtime YAML selection. Pass the YAML-derived public template-name map through SvelteKit's runtime bootstrap, avoiding routing lookup requests and custom browser metadata. Upgrade Vite to fix stylesheet readiness during client navigation.
