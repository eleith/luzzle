---
"@luzzle/web": patch
---

Replace Auth.js with stateless Better Auth for YAML credentials and OIDC. Sessions
last seven days without rolling renewal; existing sessions require a new sign-in.
Auth-enabled deployments need a resolved secret of at least 32 characters.

Use `/api/auth/callback/oidc` for OIDC registration. The configured `url.app` is
the public-URL authority for both authentication and the web server; separate
auth URL overrides are no longer used. Public-only deployments still need no
authentication secret.
