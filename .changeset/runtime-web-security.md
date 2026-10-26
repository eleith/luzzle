---
"@luzzle/web": patch
---

Keep framework assets same-origin and resolve public/auth origins at server
startup. Add validated runtime asset prefixes to SvelteKit's generated CSP while
preserving nonces, hashes and built-in CSRF checks. Production build configuration
no longer reads deployment YAML for security or development networking settings.
