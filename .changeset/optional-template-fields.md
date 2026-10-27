---
"@luzzle/web": patch
"@luzzle/web.worker": patch
---

Treat null metadata values as missing during template field lookup. Preserve valid
mapped fields when optional images or dates are absent, apply existing defaults,
and handle null collections like missing collections. Keep explicit configured
values and validation of genuinely invalid mapped data unchanged.

Select the note page and lined-notebook-paper icon/Open Graph templates for demo
words, replacing its browser-window/article selections and unused mappings.
