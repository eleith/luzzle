---
'@luzzle/web': minor
'@luzzle/web.worker': minor
---

Configure `pieces` as a map keyed by piece type rather than a list with a `type` field in each entry. Duplicate YAML keys are rejected instead of allowing competing definitions. Public piece responses and template role mappings are unchanged.
