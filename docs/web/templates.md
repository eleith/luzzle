# Templates

Each piece type has three independent roles: `icon` for listings and search,
`page` for the detail page, and `opengraph` for the share card. Omit any role to
use its generic built-in `default`; omitting `templates` uses all three defaults.
To customize a role, point it at a trusted local Svelte file. No app build is needed.

## Migrate a named design

**`default` is the only supported `name`.** Former names such as `book`, `note`
and `poster` fail config validation, even alongside `file`. If a role already has a
`file`, keep that file and its mapping; remove only the retired `name`. A failed
icon row now uses `default`.

For a role that selected its design by name alone, migrate before upgrading:

1. Find the look you want in the [demo templates](../../apps/web/demo/content/templates).
   Copy the relevant `icon.svelte`, `page.svelte`, or `opengraph.svelte` from the
   matching release into your site's `content/templates/` tree. Use the table below
   to find the directory for each role.
2. Replace each non-default `name` with its `file` path, such as
   `file: ./content/templates/word/page.svelte`. Keep or adapt the role's `mapping`
   to your frontmatter; the [demo YAML](../../apps/web/demo/config/config.yaml)
   pairs each file with its selectors. Archive type names need not match directory names.
3. Mount `./content:/app/content:ro` on web and worker as in the [Compose example](docker-compose.yml).
   Web reads all three roles; worker needs the Open Graph file to generate PNGs.
   [Apply the changes](#apply-your-choices) after the files are in place.

| Former icon or Open Graph name | Former page name | Demo directory |
| --- | --- | --- |
| `book` | `book` | `book/` |
| `browser-window` | `article` | `article/` |
| `code-snippet` | `snippet` | `snippet/` |
| `lined-notebook-paper` | `note` | `word/` |
| `playing-cards` | `tabletop-game` | `tabletop-game/` |
| `poster` | `film` | `film/` |
| `recipe-card` | `recipe` | `recipe/` |
| `video-game-cartridge` | `video-game` | `video-game/` |
| `vinyl-record` | `music` | `music/` |

If you don't need a custom look, remove that role's entire config instead.
To keep default-specific mappings, use `name: default` and only keys supported by that role.

## Set up types for local templates

Copy or download the standalone [props.d.ts](../../apps/web/demo/content/templates/props.d.ts)
and save it as `content/templates/props.d.ts`. In the repository’s file viewer,
select your web release tag (or the commit of your running build) before choosing **Raw**.
This one file supplies editor types for all three roles. You don’t need a source
checkout or any installed Luzzle packages to write a template.

Keep your mapped field types in a separate `content/templates/fields.d.ts` beside `props.d.ts`.
`props.d.ts` comes from Luzzle; `fields.d.ts` belongs to your site. For example, if your
book icon maps `image`, `author`, and `pages`, declare:

```ts
// content/templates/fields.d.ts
export type BookIconFields = { image?: string; author?: string; pages?: number }
```

Then import both types in `content/templates/book/icon.svelte`. Your editor can complete
`fields.image` and flag a misspelling like `fields.imgae`:

```svelte
<script lang="ts">
  import type { IconProps } from '../props'
  import type { BookIconFields } from '../fields'

  let { piece, fields, helpers, size, lazy }: IconProps<BookIconFields> = $props()
</script>
```

The [demo fields.d.ts](../../apps/web/demo/content/templates/fields.d.ts) has examples for
all three roles. Optional fields describe what a design can use, not what the demo maps.
For example, the music page can use `spotifyId`, but won’t receive it until you add a mapping.
These imports are erased during compilation: neither file is required to render a template,
and neither changes or validates your YAML.

## Use a local icon on piece listings

To replace the icons on `/pieces/books`, put a **trusted, operator-authored**
`.svelte` file in the web service’s content mount. Under `pieces.books.templates`, set:

```yaml
icon:
  file: ./content/templates/book/icon.svelte
  mapping:
    image: cover
    author: author
    pages: pages
```

`file` is a local path relative to the web process’s working directory (beside the
`config.yaml` alias, `/app` in production Docker), not relative to the physical
`config/` mount or the requested URL. The demo books listing selects the [3D book icon](../../apps/web/demo/content/templates/book/icon.svelte).
If a local icon fails to render for a piece, its row uses the generic `default`
icon (mapped image or title). There is no alternate fallback name.
In `/api/pieces` and `/api/search` results, `templates.icon.name`, `templates.page.name`
and `templates.opengraph.name` are always `default`, including for file-backed
roles. Each role's `fields` contains only resolved values supported by its
default (for the book icon, `image`, not `author` or `pages`), not the authored
component's extra mapped fields.

For a smaller starting point, copy the [minimal icon starter](../../apps/web/demo/content/templates/icon/example.svelte)
to `content/templates/book/icon.svelte` and copy its `ExampleIconFields` declaration into your `fields.d.ts`.

Matching pieces use this file on their **type listing**, the **mixed `/pieces` listing**,
on every page of a **tag listing**, in **search results** (including type-filtered searches), and in the homepage’s
**Latest and Random** collections. The admin **Published → Icon** and **Preview → Icon**
tabs render the same file. Use the template’s `size` prop: home requests 80px,
listings 125px, and the admin viewer 500px. Resolve images through `helpers` so
Published uses public assets and Preview uses assets from the selected preview job.
Without a file, the Icon tab renders the generic default.
This setting does not select a page or Open Graph design. The file can read arbitrary `fields` from `mapping` using the same
bindings as below. Only keys supported by the built-in icon are used by its
fallback; remove any file-only mapping keys when removing `file`.

Use a self-contained server-renderable component: it receives `piece`, `fields`,
`helpers`, `size`, and `lazy`. Type-only imports are fine; runtime imports, browser
event handlers, and effects are not supported. **Templates execute in the web
server process**; the compiler is not a sandbox. Do not use uploads, archive
metadata, or request parameters to supply code or filenames.

Preview jobs use a separate compiled template from public pages and the Published
viewer, even when both use the same file. Within each of those two caches the
module is reused across requests, not isolated per piece or preview job. Keep
`piece`, mapped fields, helpers, and asset URLs inside the component instance so a
later render cannot reuse another piece’s or job’s data. These caches isolate
module instances, not the server process: templates must still be trusted.

If mapping the external fields or rendering the component throws for a piece,
only that row uses the built-in icon. Its link and the other rows remain usable.
Check the web logs for the piece type and slug.

File errors are different: with `LUZZLE_DEV=true`, the listing loads the file on
request. A missing or invalid file fails the request; fix the file and refresh.
Production loads configured files at web startup. An unreadable file, compile
error, or unsupported feature prevents startup; fix the file or remove `file`
(and any file-only mapping keys), then restart web.

For both local icons and pages: after a source-only edit, restart web in production.
After a YAML edit, restart web and worker. Then [clear cached HTML and data responses](deployment.md#clear-cached-public-pages)
for the affected URLs and reload open tabs. No app rebuild or republish is needed.

## Use a local page on public piece URLs

Set `templates.page.file` on the piece type to replace the body of its public detail
page. `/pieces/<type>/<slug>` renders that file directly; it does not route through
a named page design. The app supplies SEO metadata and the main landmark. Write the contents of `<main>` (for example, an `<article>` with
one `<h1>`); use ordinary links for navigation. The page renders without JavaScript.
The same file renders the admin **Published → Page** and **Preview → Page** tabs;
no `name` is needed.

```yaml
page:
  file: ./content/templates/book/page.svelte
  mapping:
    image: cover
    author: author
```

The [demo book page](../../apps/web/demo/content/templates/book/page.svelte) receives
`piece`, `fields`, `tags` (`{ slug, tag }`), and `helpers` for assets and links.
Published uses the public record and asset URLs. Preview uses the completed job’s
record, tags, and protected asset URLs. Its compiled module is separate from the
one shared by the public page and Published viewer, not isolated per job.
For links to public content use root-relative URLs or resolve them against
`helpers.getPieceUrl()`: a document-relative link in an admin tab resolves under the viewer URL. Use `helpers.formatPieceDate`, `helpers.safeExternalUrl`, and `helpers.interpolate`
in place of runtime imports when porting a built-in design. Authors can
`import type { PageProps } from '../props'`.

No navigation bar is added by default. To include the app’s interactive bar above the page content,
call `helpers.requestNavBar({ showRandom: true })` in the template’s instance script.
The book passes its palette colors here.

The same trusted-source, server-only and file-reload rules as for icons apply.
A page render error fails the request; there is no per-piece page fallback.
Without a file, the public route and both admin Page tabs render the generic default.

## Use a local Open Graph card

Set `templates.opengraph.file` to render the same design in **Share → HTML** and in the
worker that generates the 1200×630 PNG. For example, the [demo book card](../../apps/web/demo/content/templates/book/opengraph.svelte) uses:

```yaml
opengraph:
  file: ./content/templates/book/opengraph.svelte
  mapping:
    image: cover
    author: author
    pages: pages
```

Mount the same trusted file in **both web and worker**, relative to each service’s
working directory. The component receives `piece`, `fields`, and `helpers`; it can
`import type { OpengraphProps } from '../props'`.
Use the image helpers rather than hard-coding delivery URLs: the Share preview uses
public or job-specific URLs, while the worker supplies local image bytes to Takumi.
The book also uses `helpers.getTitleSizeRem` and `helpers.formatPieceDate`.

**HTML** shows the current template without JavaScript. **Image** shows the PNG
recorded when you published or generated that preview. Editing the template does
not rewrite old PNGs. In production, restart web and worker after changing the
file; generate a fresh Preview or use **More → Publish** for each affected piece.
If the current card fails to render for a record, Share reports the error without hiding
its recorded PNG. Without a file, Share HTML and the worker both use the default card.

## Map your metadata

Templates read the metadata fields you map to them. For example, to use the authored book designs:

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
          author: author
          pages: pages
      page:
        file: ./content/templates/book/page.svelte
        mapping:
          image: cover
          author: author
          publicationYear: year_first_published
      opengraph:
        file: ./content/templates/book/opengraph.svelte
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
the [demo snippet page](../../apps/web/demo/content/templates/snippet/page.svelte)’s `files` mapping:

```yaml
files:
  each: files
  fields:
    file: file
    name: name
    format: format
    type: type
```

The mapping describes each file; it does not generate downloads or highlighted code.
The demo sets `fields.attachments` and `fields.highlight` to `["files[*].file"]`
so the page can look up those outputs using the mapped file key.

Missing or `null` metadata counts as absent: a `field` binding uses its default,
an absent `each` produces an empty list, and template defaults apply otherwise.
Default roles validate mapped values against their field types; for example, `runtime` is a number, not text.
Each demo template imports its role’s field type when it uses mapped fields. Its YAML mapping determines which values it receives.
Local templates receive the resolved values without runtime validation against
those TypeScript types. For a built-in, invalid values log a warning and use that role's default field values for the
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
images, use **More → Publish** in the source editor for affected pieces. YAML changes alone
do not mark unchanged pieces for republication. No app rebuild or hot reload.

For default role fields, see the [generated config schema](../../packages/web/templates/config.schema.json).
For authored roles, consult the [demo source and field types](../../apps/web/demo/content/templates).
