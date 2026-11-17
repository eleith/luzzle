---
"@luzzle/web": patch
---

Render type-specific piece listings through dedicated icon-template routes so SvelteKit delivers only the selected icon styles while preserving server-rendered cards, public URLs, and pagination. Derive icon routing from runtime YAML using the same selection rules as field hydration, and redirect direct internal route visits to the canonical public listing.
