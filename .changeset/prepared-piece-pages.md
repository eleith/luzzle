---
"@luzzle/web": patch
---

Use worker-prepared templates for public piece details, published-page inspection,
and completed preview pages, with request-bound helpers, matching revision CSS,
app-owned navigation and built-in presentation fallback.

Select detail types from runtime server configuration without changing URLs.
Migrate demo page/icon inputs and the remaining app icon consumer together; keep
site and Open Graph migration separate. Retain app-owned SEO for this milestone.
Provide portable demo author declarations without workspace imports and share the
canonical default page body. Represent banner absence explicitly as navBanner: null;
static helpers construct URLs without checking publication availability.
