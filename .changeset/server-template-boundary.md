---
"@luzzle/web": patch
---

Keep customizations server-rendered and consolidate input isolation, navigation
capture, revision pinning and matching theme styles in one page-rendering boundary.
Piece and feed adapters retain their own template selection and fallback policies.

Keep the demo feed's subscription information, format links, styling and selectable
read-only URL, but remove its copy button and browser-dependent handlers/state.
The existing feed override can now be enabled without an inactive browser control.
