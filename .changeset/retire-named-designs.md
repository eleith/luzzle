---
'@luzzle/web': minor
'@luzzle/web.worker': minor
---

Remove all built-in template names except `default`. If a role already uses a local file, keep it and its mapping; remove only the retired `name`. For name-only roles, choose a trusted local `file` and mapping before upgrading, or omit the role for its generic default. The former designs are available as authored files in `apps/web/demo/content/templates`; mount them on web and the Open Graph files on worker. Pieces and search APIs report `default` names and default-supported fields. Public URLs stay the same and no per-design routes are generated.
