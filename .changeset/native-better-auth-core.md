---
"@luzzle/web": patch
---

Prepare a stateless Better Auth core for YAML credentials and OIDC, with fixed
seven-day sessions and resolved-secret validation. The core is not wired into
requests yet; Auth.js continues to handle the existing sign-in flow.
