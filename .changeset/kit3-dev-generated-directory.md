---
"@luzzle/web": patch
---

Prepare SvelteKit 3's generated node_modules/$app directory for the configured
non-root development user, without widening dependency-directory permissions
or changing the production image.

Enable distinct demo Markdown overrides for 404, remaining 4xx, and server errors.
