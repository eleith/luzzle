---
title: A Readable Slug
summary: Turn a short title into a lowercase ASCII slug, keeping word boundaries and dropping punctuation.
date_added: 2026-11-02
date_updated: 2026-11-03
keywords: python, text, utilities, web
files:
  - file: .assets/snippets/a-readable-slug.snippets/slugify.py
    name: slugify.py
    type: snippet
    format: python
---
A small Python helper for filenames and draft URLs. For example,
`slugify("Café by the River!")` produces `cafe-by-the-river`.

This is deliberately a narrow tool: it transliterates to ASCII and does not
make duplicate titles unique. Keep the original title beside the slug if it
needs to be displayed later.
