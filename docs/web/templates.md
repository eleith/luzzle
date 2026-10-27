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
piece. Unknown names/keys and malformed selectors fail config validation.

## Apply your choices

Restart web and worker after config changes, then refresh. To regenerate OG
images, edit and save affected pieces, then publish again. YAML changes alone
do not mark unchanged pieces for republication. No app rebuild or hot reload.

For all field choices, use the [generated schema](../../packages/web/templates/config.schema.json).
Visual details and defaults live in the built-in [icon](../../packages/web/templates/src/icons),
[page](../../packages/web/templates/src/pages), and [OG](../../packages/web/templates/src/opengraphs) sources.
