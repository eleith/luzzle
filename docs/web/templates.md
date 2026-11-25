# Piece templates

Each archive type can select three independent designs: `icon` for listings,
`page` for the detail view, and `opengraph` for Share HTML and the recorded
1200×630 PNG. Omit a role to use its generic default.

```yaml
pieces:
  books:
    fields:
      title: title
      date_consumed: date_read
      media: [cover]
    templates:
      icon:
        file: ./content/templates/book/icon.svelte
        mapping:
          image: cover
```

`pieces.books.fields` tells Luzzle how to process a piece (for example, which
images to prepare). A role’s `mapping` supplies values to that component:
`image: cover` makes the book’s `cover` metadata available as `fields.image`.
Use the supplied asset helpers so the same design works with published and preview assets.

Files are trusted, server-rendered Svelte, not browser components or sandboxed
uploads. Paths are relative to the service’s working directory (`/app` in Docker).
Web reads all three roles; mount Open Graph files at the same paths in the worker.
No custom app build is needed.

For editor support, copy [props.d.ts](../../apps/web/demo/content/templates/props.d.ts)
for the host props and define your own [fields.d.ts](../../apps/web/demo/content/templates/fields.d.ts)
for your mappings. Use `import type`; these declarations do not supply or validate data.
See the [demo config](../../apps/web/demo/config/config.yaml) and
[Svelte files](../../apps/web/demo/content/templates) for complete examples.

## Applying edits

In production, restart web after an icon or page file edit. Restart web and worker
after an Open Graph file or YAML edit. [Clear cached public responses](deployment.md#clear-cached-public-pages)
for affected URLs. Share HTML uses the current design; to replace a recorded PNG,
republish the piece or generate a fresh preview.
