---
"@luzzle/web": patch
---

Render piece/all-type and tag HTML-feed overrides from worker-prepared bundles
using the existing FeedPageProps, navigation helper and bundle-owned PieceIcon.
Keep feed queries and machine-readable formats unchanged, pin matching theme CSS,
isolate serving data, and fall back as a whole when presentation fails.

Keep app-owned SEO, theme initialization and RSS discovery independent of optional
navigation. Share the canonical feed's original item cards and styling without
the subscription/copy card. Keep the richer demo feed source available but
unselected until browser activation is integrated; the current override path is
SSR-only. Stop copying feed sources into the app, retire
stale generated copies without deleting configured template sources, and update
portable author declarations. Root/error consumers and template browser hydration
remain separate work.
