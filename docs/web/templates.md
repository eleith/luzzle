# Templates

Choose built-in templates in YAML. No Svelte files or custom application build needed.

Each type has three independent roles: `icon` for lists/search, `page` for its
detail page, and `opengraph` for the share image generated during publishing.
Omit a role to use its `default`. Choosing one role does not choose the others.

## Pick a look

Icons and Open Graph cards each offer nine named styles, plus `default`:
`book`, `browser-window`, `code-snippet`, `lined-notebook-paper`, `playing-cards`,
`poster`, `recipe-card`, `video-game-cartridge`, and `vinyl-record`.

Pages have nine different names, plus `default`:
`book`, `film`, `article`, `note`, `recipe`, `music`, `snippet`, `video-game`, and
`tabletop-game`.

For text-first pieces, use `lined-notebook-paper` for icon/OG and `note` for page,
as in the [minimal config](config.example.yaml). Your archive type and schema
are independent of template names: `words` can use `note`, `books` can use `book`.

The `recipe` page shows a ring-bound recipe card in its header. The card keeps
its cream paper and dark ink in both site themes. To use the same card in
listings and the Icon preview, set `templates.icon.name: recipe-card`
for the same piece type and map both `icon` and `page` image fields to the same
photo selector. Map the same ingredient names in both roles to show the same
short checklist.

## Use a local icon on a type listing

To replace the icons on `/pieces/books`, put a **trusted, operator-authored**
`.svelte` file in the web service’s content mount. Under `templates` in the `pieces` entry for `books`, set:

```yaml
icon:
  file: ./content/templates/icon/example.svelte
  name: book
  mapping:
    image: cover
    author: author
    pages: pages
```

`file` is a local path relative to the web process’s working directory (beside the
`config.yaml` alias, `/app` in production Docker), not relative to the physical
`config/` mount or the requested URL. The [demo component](../../apps/web/demo/content/templates/icon/example.svelte)
and its adjacent `props.d.ts` are a copyable example. In the demo, removing just
`file` restores the built-in book design with the same mapped metadata.

Only the public **type listing** renders this file. Mixed listings, home, search
(including type-filtered searches), tags, and admin previews still use the
built-in `name`, or `default` when omitted. Page and Open Graph templates are
unchanged. The file can read arbitrary `fields` from `mapping` using the same
bindings as below. Only keys supported by the built-in icon are used by its
fallback; remove any file-only mapping keys when removing `file`.

Use a self-contained server-renderable component: it receives `piece`, `fields`,
`helpers`, `size`, and `lazy`. Type-only imports are fine; runtime imports, browser
event handlers, and effects are not supported. **Templates execute in the web
server process**; the compiler is not a sandbox. Do not use uploads, archive
metadata, or request parameters to supply code or filenames.

If mapping the external fields or rendering the component throws for a piece,
only that row uses the built-in icon. Its link and the other rows remain usable.
Check the web logs for the piece type and slug.

File errors are different: with `LUZZLE_DEV=true`, the listing loads the file on
request. A missing or invalid file fails the request; fix the file and refresh.
Production loads configured files at web startup. An unreadable file, compile
error, or unsupported feature prevents startup; fix the file or remove `file`
(and any file-only mapping keys), then restart web.

After a source-only edit, restart web in production. After a YAML edit, restart
web and worker. Then [clear cached listing responses](deployment.md#clear-cached-public-pages)
and reload open tabs. No app rebuild or republish is needed for listing icons.

## Map your metadata

Templates read the metadata fields you map to them. For example:

```yaml
pieces:
  - type: books
    fields:
      title: title
      date_consumed: date_read
      media: [cover]
    templates:
      icon:
        name: book
        mapping:
          image: cover
          author: author
          pages: pages
      page:
        name: book
        mapping:
          image: cover
          author: author
          publicationYear: year_first_published
      opengraph:
        name: book
        mapping:
          image: cover
          author: author
```

Mappings are role-specific. `publicationYear` is a book-page field, not a
book-icon field. List image fields under `fields.media` so publishing prepares
their assets; use `fields.attachments` for attachments such as snippet files.

Strings are metadata selectors, not literal text:

```yaml
author: author.name
pages: { field: page_count, default: 100 }
```

Use `{ value: 'Anonymous' }` for literal text. For arrays, map each item; this is
a snippet page's `files` mapping:

```yaml
files:
  each: files
  fields:
    file: file
    name: name
    format: format
```

Missing or `null` metadata counts as absent: a `field` binding uses its default,
an absent `each` produces an empty list, and template defaults apply otherwise.
Values must match the chosen field types; a page count is a number, not text.
Invalid values log a warning and use that role's default field values for the
piece. Unknown built-in names, unsupported mapping keys on built-in-only roles,
and malformed selectors fail config validation.

## Image-derived colors

The first registered image resolved from `fields.media` supplies a shared palette
for banners, icons, and OG templates that use it. The recipe card icon keeps its
cream paper instead. Colorful images favor representative
colored backgrounds; monochrome images retain neutral tones. Black or white text
is chosen for contrast against the solid palette background. Image layers under
translucent template surfaces can still change the final rendered contrast.

Generate a fresh Preview to inspect the colors, then use the piece's Publish
action to regenerate its public outputs. Existing published palettes and OG
images do not change automatically.

## Apply your choices

Restart web and worker after config changes, then refresh. To regenerate OG
images, edit and save affected pieces, then publish again. YAML changes alone
do not mark unchanged pieces for republication. No app rebuild or hot reload.

For all field choices, use the [generated schema](../../packages/web/templates/config.schema.json).
Visual details and defaults live in the built-in [icon](../../packages/web/templates/src/icons),
[page](../../packages/web/templates/src/pages), and [OG](../../packages/web/templates/src/opengraphs) sources.
