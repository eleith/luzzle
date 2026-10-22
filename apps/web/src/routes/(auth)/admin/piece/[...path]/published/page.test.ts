import { readFileSync } from 'node:fs'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import { MarkdownPublicationStatus } from '$lib/pieces/types'
import { publishedPiece, asset } from '$lib/pieces/viewer/fixtures/published'
import Overview from './+page.svelte'
import PublishedTree from './fixtures/PublishedTree.svelte'

const { page } = vi.hoisted(() => ({
	page: {
		url: new URL('https://app.test/admin/piece/books/book.md/published'),
		params: {},
		data: { config: { url: { app: '/garden', luzzle_assets: '/cdn' } } }
	}
}))
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/paths', () => ({
	resolve: (route: string, params: Record<string, string>) =>
		route.replace(/\[(?:\.\.\.)?(\w+)\]/g, (_, name: string) => params[name])
}))
// These synchronous renderer stubs establish route props, URLs and landmarks;
// they do not exercise the wrappers' asynchronous imports or client replacement.
vi.mock('$lib/pieces/components/page.svelte', async () => ({
	default: (await import('$lib/pieces/viewer/fixtures/PageRenderer.svelte')).default
}))
vi.mock('$lib/pieces/components/icon.svelte', async () => ({
	default: (await import('$lib/pieces/viewer/fixtures/IconRenderer.svelte')).default
}))
vi.mock('$lib/pieces/components/opengraph.svelte', async () => ({
	default: (await import('$lib/pieces/viewer/fixtures/Composition.svelte')).default
}))
function data(
	status: MarkdownPublicationStatus = MarkdownPublicationStatus.MATCHING,
	time: number | null = 1234
): ComponentProps<typeof Overview>['data'] {
	return {
		pieceTypes: ['books'],
		file: 'books/<draft #?%>.books.md',
		piece: publishedPiece,
		tags: [{ slug: 'fiction', tag: 'Fiction' }],
		publication: { lastPublishedAt: time, markdownStatus: status },
		publishedUrl: 'https://public.test/garden/pieces/books/published%20%23%3F%25',
		links: {
			source: '/admin/piece/books/book.md/source',
			overview: '/admin/piece/books/book.md/published',
			page: '/admin/piece/books/book.md/published/page',
			icon: '/admin/piece/books/book.md/published/icon',
			share: '/admin/piece/books/book.md/published/share'
		},
		config: {
			content: { text: { title: 'Garden', description: 'Description' } },
			url: { app: '/garden', app_assets: '/static', luzzle_assets: '/cdn' }
		},
		meta: { title: 'Garden', description: 'Description' }
	}
}
beforeEach(() => {
	page.url = new URL('https://app.test/admin/piece/books/book.md/published')
})

test('Overview shows escaped published identity, actual completion time and external public link', () => {
	const html = render(Overview, { props: { data: data(), params: { path: data().file } } }).body
	expect(html).toContain('Published &lt;Book>')
	expect(html).not.toContain('books/&lt;draft #?%>.books.md')
	expect(html).toContain('Type')
	expect(html).toContain('books')
	expect(html).toContain('<caption')
	expect(html).toContain('Publication</caption>')
	expect(html).toMatch(/<th[^>]*scope="row"[^>]*>Last publish<\/th>/)
	expect(html).not.toMatch(/<th[^>]*scope="row"[^>]*>Source<\/th>/)
	expect(html).not.toContain('Excludes')
	expect(html).not.toContain('Unsaved edits · attachment bytes')
	expect(html).not.toContain('Status covers indexed Markdown')
	expect(html).toContain('datetime="1970-01-01T00:00:01.234Z"')
	expect(html).toContain('UTC')
	expect(html).toContain(
		'href="https://public.test/garden/pieces/books/published%20%23%3F%25" target="_blank" rel="noopener noreferrer"'
	)
	expect(html).toContain(`<bdi dir="ltr">${data().publishedUrl}</bdi>`)
	expect(html).not.toContain('href="/admin/piece/books/book.md/source"')
	expect(html).not.toContain('>Open<')
	expect(html).not.toContain('<details')
	expect(html).toContain('href="/cdn/pieces/assets/published/cover.jpg"')
	expect(html.match(/<main /g)).toHaveLength(1)
	expect(html).not.toContain('<draft')
	expect(html).not.toContain('Serving metadata only')
	expect(html).not.toContain('/admin/asset')
})

test('only the public URL remains a linked field value; long source paths are absent', () => {
	const props = data()
	props.piece = { ...publishedPiece, assets: [] }
	props.file = `${'nested folder/'.repeat(24)}雪 <long & "draft">.books.md`
	props.publishedUrl = `https://public.test/${'long-prefix/'.repeat(24)}published`
	const html = render(Overview, { props: { data: props, params: { path: props.file } } }).body
	const links = html.match(/<a\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/a>/g) ?? []
	expect(links).toHaveLength(1)
	for (const link of links) {
		expect(link).toMatch(/class="truncated[^"]*"/)
		expect(link).toMatch(/<bdi[^>]*dir="ltr"[^>]*>/)
		expect(link).not.toContain('aria-label=')
	}
	expect(html).not.toContain(props.links.source)
	expect(html).not.toContain('nested folder/')
	expect(links[0]).toContain(`href="${props.publishedUrl}"`)
	expect(links[0]).toContain(`>${props.publishedUrl}</bdi>`)
	expect(links[0]).toContain('target="_blank" rel="noopener noreferrer"')
	for (const excluded of ['<details', '<summary', '>Open<', '<long'])
		expect(html).not.toContain(excluded)
})

test('publication rows retain explicit table semantics when styled as narrow-screen fields', () => {
	const props = data()
	props.piece = { ...publishedPiece, assets: [] }
	const html = render(Overview, { props: { data: props, params: { path: props.file } } }).body
	const publication = html.slice(0, html.indexOf('</table>') + '</table>'.length)
	expect(publication).toMatch(/<table[^>]*role="table"/)
	expect(publication).toMatch(/<tbody[^>]*role="rowgroup"/)
	expect(publication.match(/<tr[^>]*role="row"/g)).toHaveLength(4)
	expect(publication.match(/<th[^>]*scope="row"[^>]*role="rowheader"/g)).toHaveLength(4)
	expect(publication.match(/<td[^>]*role="cell"/g)).toHaveLength(4)
})

test('publication and asset tables use the same caption, cell padding and metadata size', () => {
	const sources = [
		readFileSync(
			new URL('../../../../../../lib/pieces/viewer/PieceOverview.svelte', import.meta.url),
			'utf8'
		),
		readFileSync(
			new URL('../../../../../../lib/pieces/viewer/AssetOutputs.svelte', import.meta.url),
			'utf8'
		)
	]
	for (const source of sources) {
		const styles = source.slice(source.indexOf('<style>'))
		expect(styles.match(/\bcaption\)?\s*\{([^}]+)\}/)?.[1]).toContain(
			'padding: var(--space-2) var(--space-3)'
		)
		expect(
			styles.match(/\bth\)?,\s*(?:\.overview :global\(\.overview-facts )?td\)?\s*\{([^}]+)\}/)?.[1]
		).toContain('padding: var(--space-2) var(--space-3)')
		const tableRules = [...styles.matchAll(/\btable\)?\s*\{([^}]+)\}/g)]
		expect(tableRules.some((rule) => rule[1].includes('font-size: var(--font-size-xs)'))).toBe(true)
		expect(styles.slice(styles.indexOf('@media'))).toContain(
			'padding: var(--space-2) var(--space-3)'
		)
	}
})

test('epoch-zero completion is a recorded time, not an Unknown state', () => {
	const props = data(MarkdownPublicationStatus.MATCHING, 0)
	const html = render(Overview, { props: { data: props, params: { path: props.file } } }).body
	expect(html).toContain('datetime="1970-01-01T00:00:00.000Z"')
	expect(html).toContain('data-status="matching"')
})

test.each([
	[MarkdownPublicationStatus.MATCHING, 'Matches publish'],
	[MarkdownPublicationStatus.CHANGED, 'Unpublished changes'],
	[MarkdownPublicationStatus.UNKNOWN, 'Unknown']
] as const)(
	'status %s and Unknown timestamp are truthful and independent of source dates',
	(status, copy) => {
		const html = render(Overview, {
			props: { data: data(status, null), params: { path: data().file } }
		}).body
		expect(html).toMatch(new RegExp(`data-status="${status}"[^>]*>${copy}</span>`))
		expect(html).toMatch(/<th[^>]*scope="row"[^>]*>State<\/th>/)
		expect(html.replace(/<!--[^]*?-->/g, '').replace(/\s+/g, ' ')).toMatch(
			/Last publish<\/th>\s*<td[^>]*>\s*<span[^>]*>Unknown<\/span>/
		)
		expect(html).not.toContain('Unsaved edits · attachment bytes')
		expect(html).not.toContain('Indexed Markdown')
		expect(html).not.toContain('<time')
	}
)

test.each(['https://cdn.test/prefix/', '/cdn/prefix/', ''])(
	'Overview selects public CDN/app fallback for base %s',
	(base) => {
		const props = data()
		props.config.url.luzzle_assets = base
		const html = render(Overview, { props: { data: props, params: { path: props.file } } }).body
		expect(html).toContain(
			`href="${(base || '/garden').replace(/\/+$/, '')}/pieces/assets/published/cover.jpg"`
		)
	}
)

test('Overview, not Share, links only the actual recorded generated output', () => {
	const props = data()
	props.piece = {
		...publishedPiece,
		assets: [asset('opengraph', 'piece/generated.png', 'piece', 'image/png')]
	}
	const html = render(Overview, { props: { data: props, params: { path: props.file } } }).body
	const generatedLink = html.match(
		/<a[^>]*href="\/cdn\/pieces\/assets\/piece\/generated.png"[^>]*>/
	)?.[0]
	expect(generatedLink).toContain('target="_blank"')
	expect(generatedLink).toContain('rel="noopener noreferrer"')
	expect(html).toMatch(/<a[^>]*href="\/cdn\/pieces\/assets\/piece\/generated.png"[^>]*>View<\/a>/)
	expect(html).not.toContain('>Open<')
	expect(html).not.toContain('<details')
	expect(html).not.toContain('<img')
	expect(html).not.toContain('Rendered share composition')
})

test('Overview keeps JSON and HTML collapsed behind Show without exposing or executing either', () => {
	const props = data()
	props.piece = {
		...publishedPiece,
		assets: [
			{
				...asset('palette', null, 'piece', 'application/json'),
				content: '{"background":"#123456","accent":"#abcdef"}'
			},
			{
				...asset('markdown', null, 'piece', 'text/html'),
				content: '<script>alert(1)</script><h1>Serving body</h1>'
			},
			asset('custom.output', 'published/output.pdf', 'piece', 'application/pdf')
		]
	}
	const html = render(Overview, { props: { data: props, params: { path: props.file } } }).body
	expect(html).toContain('Palette</caption>')
	expect(html).toContain('aria-label="Show Palette: Asset 1, Content"')
	expect(html).not.toContain('{"background":"#123456","accent":"#abcdef"}')
	expect(html).not.toContain('background</bdi>')
	expect(html).not.toContain('accent</bdi>')
	expect(html).not.toContain('style=')
	expect(html).toContain('Markdown</caption>')
	expect(html).toMatch(/<button\b[^>]*>[\s\S]*?Show[\s\S]*?<\/button>/)
	expect(html).toContain('aria-expanded="false"')
	expect(html).not.toContain('alert(1)')
	expect(html).not.toContain('Serving body')
	expect(html).not.toContain('<script>')
	expect(html).not.toContain('<h1>Serving body')
	expect(html).toContain('href="/cdn/pieces/assets/published/output.pdf"')
	expect(html).not.toContain('Other published files')
	expect(html.match(/<main /g)).toHaveLength(1)
})

test('Overview retains every recorded Opengraph output for inspection, including invalid and non-PNG rows', () => {
	const props = data()
	props.piece = {
		...publishedPiece,
		assets: [
			asset('opengraph', 'piece/image.png', 'piece', 'image/png'),
			asset('opengraph', 'piece/image.jpg', 'piece', 'image/jpeg'),
			asset('opengraph', '../unsafe.png', 'piece', 'image/png')
		]
	}
	const html = render(Overview, { props: { data: props, params: { path: props.file } } }).body
	expect(html).toContain('href="/cdn/pieces/assets/piece/image.png"')
	expect(html).toContain('href="/cdn/pieces/assets/piece/image.jpg"')
	expect(html).toContain('../unsafe.png</bdi>')
	expect(html).not.toContain('href="/cdn/pieces/assets/..')
	expect(html).toContain('Unavailable</small>')
})

test('Overview hides internal asset identifiers and preserves related outputs with readable groups', () => {
	const props = data()
	const first = `internal-asset-${'a'.repeat(64)}`
	const second = `internal-asset-${'b'.repeat(64)}`
	const piece = `internal-piece-${'c'.repeat(64)}`
	props.piece = {
		...publishedPiece,
		assets: [
			asset('image.original', 'one/cover.jpg', first),
			asset('image.s.webp', 'one/s.webp', first, 'image/webp'),
			asset('attachment', 'one/doc.pdf', first, 'application/pdf'),
			{ ...asset('highlight', null, first, 'text/html'), content: '<code>one</code>' },
			asset('image.original', 'two/cover.jpg', second),
			asset('image.s.webp', 'two/s.webp', second, 'image/webp'),
			asset('attachment', 'two/doc.pdf', second, 'application/pdf'),
			{ ...asset('highlight', null, second, 'text/html'), content: '<code>two</code>' },
			{ ...asset('palette', null, piece, 'application/json'), content: '{"background":"#123456"}' }
		]
	}
	const html = render(Overview, {
		props: { data: props, params: { path: props.file } }
	}).body.replace(/<!--[^]*?-->/g, '')
	for (const key of [first, second, piece]) expect(html).not.toContain(key)
	for (const excluded of ['>Key<', 'Technical details', '<details'])
		expect(html).not.toContain(excluded)
	expect(html).toContain('Asset 1')
	expect(html).toContain('Asset 2')
	for (const path of [
		'one/cover.jpg',
		'one/s.webp',
		'one/doc.pdf',
		'two/cover.jpg',
		'two/s.webp',
		'two/doc.pdf'
	]) {
		expect(html).toContain(`href="/cdn/pieces/assets/${path}"`)
	}
	expect(html).toContain('aria-label="Show Highlight: Asset 1, Content"')
	expect(html).toContain('aria-label="Show Highlight: Asset 2, Content"')
	expect(html).not.toContain('&lt;code>one&lt;/code>')
	expect(html).not.toContain('&lt;code>two&lt;/code>')
	expect(html).toContain('aria-label="Show Palette: Asset 3, Content"')
	expect(html).not.toContain('{"background":"#123456"}')
	expect(html).not.toContain('style=')
	expect(html.match(/Image<\/caption>/g)).toHaveLength(1)
	expect(html).toContain('image.original</bdi>')
	expect(html).toContain('image.s.webp</bdi>')
	expect(html).not.toContain('>Variant<')
	expect(html.match(/<main /g)).toHaveLength(1)
})

test('every transform uses View or inline Show with no color or image roles', () => {
	const props = data()
	props.piece = {
		...publishedPiece,
		assets: [
			asset('pictures.original', 'published/cover.jpg', 'cover'),
			asset('pictures.s.webp', 'published/s.webp', 'cover', 'image/webp'),
			{
				...asset('rendered-note', null, 'piece', 'text/html'),
				content: '<script>bad()</script><h1>Serving HTML</h1>'
			},
			{
				...asset('colors.v2', null, 'piece', 'application/json'),
				content: '{"background":"#123456","swatches":["#fff","#abc"]}'
			},
			{
				...asset('custom.output', 'published/body.html', 'piece', 'text/html'),
				content: '<b>File and inline</b>'
			}
		]
	}
	const html = render(Overview, { props: { data: props, params: { path: props.file } } }).body
	for (const caption of ['Pictures', 'Rendered-note', 'Colors', 'Custom'])
		expect(html).toContain(`${caption}</caption>`)
	for (const path of ['published/cover.jpg', 'published/s.webp', 'published/body.html'])
		expect(html).toContain(`href="/cdn/pieces/assets/${path}"`)
	expect(html).toContain('aria-label="Show Rendered-note: Asset 2, Content"')
	expect(html).toContain('aria-label="Show Colors.v2: Asset 2, Content"')
	expect(html).not.toContain('{"background":"#123456","swatches":["#fff","#abc"]}')
	expect(html).toContain('aria-label="Show Custom.output: Asset 2, Content"')
	expect(html).not.toContain('bad()')
	expect(html).not.toContain('File and inline')
	expect(html).not.toContain('background</bdi>')
	expect(html).not.toContain('swatches</bdi>')
	expect(html).not.toContain('style=')
	expect(html.match(/<button /g)).toHaveLength(3)
	expect(html).not.toMatch(/ download(?:[= >])/)
	expect(html).not.toContain('<script>')
	expect(html).not.toContain('<h1>Serving HTML')
	expect(html).not.toContain('Colors (palette)</caption>')
	expect(html.match(/<main /g)).toHaveLength(1)
})

test('inline Show controls keep complete long JSON and text out of the collapsed page', () => {
	const props = data()
	const big = '  雪😀\n'.repeat(300)
	props.piece = {
		...publishedPiece,
		assets: [
			{ ...asset('future-text-job', null, 'piece', 'text/plain'), content: big },
			{
				...asset('markdown.description', null, 'piece', 'application/json'),
				content: JSON.stringify({ count: 42, label: 'short', nested: { long: big } })
			},
			asset('future-file-job', 'published/download.zip', 'piece', 'application/zip')
		]
	}
	const html = render(Overview, { props: { data: props, params: { path: props.file } } }).body
	expect(html).toContain('aria-label="Show Future-text-job: Asset 1, Content"')
	expect(html).toContain('aria-label="Show Markdown.description: Asset 1, Content"')
	expect(html).not.toContain('42</code>')
	expect(html).not.toContain('short</code>')
	expect(html).not.toContain('Show Markdown.description: Asset 1, count')
	expect(html).not.toContain('Show Markdown.description: Asset 1, label')
	expect(html).not.toContain(big)
	expect(html).toContain('href="/cdn/pieces/assets/published/download.zip"')
	expect(html).toContain('aria-label="View future-file-job: published/download.zip"')
	expect(html).not.toMatch(/ download(?:[= >])/)
	expect(html).not.toContain('<textarea')
	expect(html).not.toContain('<script>')
})

test('original image and palette names receive the same ordinary presentation as renamed jobs', () => {
	const props = data()
	props.piece = {
		...publishedPiece,
		assets: [
			asset('image.original', 'published/a.jpg', 'piece'),
			asset('image.s.webp', 'published/a.webp', 'piece', 'image/webp'),
			{
				...asset('palette', null, 'piece', 'application/json'),
				content: '{"color":"#abc","swatches":["#abc","#fff"]}'
			},
			{
				...asset('colors.v2', null, 'piece', 'application/json'),
				content: '{"color":"#abc","swatches":["#abc","#fff"]}'
			}
		]
	}
	const html = render(Overview, { props: { data: props, params: { path: props.file } } }).body
	for (const caption of ['Image', 'Palette', 'Colors'])
		expect(html).toContain(`${caption}</caption>`)
	for (const excluded of [
		'>Images</caption>',
		'>Variant<',
		'Colors (palette)',
		'background-color',
		'class="swatch',
		'None recorded'
	])
		expect(html).not.toContain(excluded)
	expect(html).toContain('aria-label="Show Palette: Asset 1, Content"')
	expect(html).toContain('aria-label="Show Colors.v2: Asset 1, Content"')
	expect(html.match(/<button /g)).toHaveLength(2)
	expect(html).not.toContain('{"color":"#abc","swatches":["#abc","#fff"]}')
	expect(html).not.toContain('color</bdi>')
	expect(html).not.toContain('swatches</bdi>')
	for (const path of ['published/a.jpg', 'published/a.webp'])
		expect(html).toContain(`href="/cdn/pieces/assets/${path}"`)
	expect(html).not.toMatch(/ download(?:[= >])/)
})

test('Overview renders one table per family with every image and Markdown output retained in an Output column', () => {
	const props = data()
	props.piece = {
		...publishedPiece,
		assets: [
			asset('image.original', 'published/original.jpg', 'image'),
			asset('image.s.webp', 'published/s.webp', 'image', 'image/webp'),
			asset('image.m.avif', 'published/m.avif', 'image', 'image/avif'),
			{
				...asset('markdown', 'published/body.html', 'piece', 'text/html'),
				content: '<h1>Body</h1>'
			},
			{
				...asset('markdown.description', null, 'piece', 'text/html'),
				content: '<p>Description</p>'
			},
			{
				...asset('markdown.metadata', null, 'piece', 'application/json'),
				content: '{"title":"Recorded title","count":42}'
			}
		]
	}
	const html = render(Overview, {
		props: { data: props, params: { path: props.file } }
	}).body.replace(/<!--[^]*?-->/g, '')
	expect([...html.matchAll(/<caption[^>]*>([^<]*)<\/caption>/g)].map((match) => match[1])).toEqual([
		'Publication',
		'Image',
		'Markdown'
	])
	for (const output of [
		'image.original',
		'image.s.webp',
		'image.m.avif',
		'markdown',
		'markdown.description',
		'markdown.metadata'
	])
		expect(html).toContain(`${output}</bdi>`)
	expect(html.match(/scope="col"[^>]*>Output<\/th>/g)).toHaveLength(2)
	for (const path of [
		'published/original.jpg',
		'published/s.webp',
		'published/m.avif',
		'published/body.html'
	])
		expect(html).toContain(`href="/cdn/pieces/assets/${path}"`)
	expect(html).not.toMatch(/ download(?:[= >])/)
	expect(html.match(/<button /g)).toHaveLength(3)
	expect(html).toContain('aria-label="Show Markdown.description: Asset 2, Content"')
	expect(html).toContain('aria-label="Show Markdown.metadata: Asset 2, Content"')
	expect(html).not.toContain('{"title":"Recorded title","count":42}')
	expect(html).not.toContain('title</bdi>')
	expect(html).not.toContain('count</bdi>')
	for (const excluded of [
		'Markdown values</caption>',
		'Body</h1>',
		'Description</p>',
		'>Variant<',
		'style=',
		'None recorded'
	])
		expect(html).not.toContain(excluded)
})

test.each(['/static', 'https://cdn.test/site-assets', ''])(
	'Published reset layout adds only the configured site favicon for asset base %j',
	(base) => {
		const props = data()
		props.config.url.app_assets = base
		const result = render(PublishedTree, { props: { data: props } })
		expect(result.head).toContain(`rel="icon" href="${base}/images/favicon.png"`)
		expect(result.head.match(/rel="icon"/g)).toHaveLength(1)
		expect(result.head).toContain('Published: Published &lt;Book>')
		expect(result.head).toContain('name="robots" content="noindex"')
		expect(result.head).not.toContain('property="og:')
		expect(result.head).not.toContain('name="description"')
		expect(result.head).not.toContain('/cdn/images/favicon.png')
		expect(result.body.match(/<main\b/g)).toHaveLength(1)
	}
)

test('reset layout keeps its inspector title/noindex and adds only the favicon, not public SEO', () => {
	const result = render(PublishedTree, { props: { data: data() } })
	expect(result.head).toContain('Published: Published &lt;Book>')
	expect(result.head).toContain('name="robots" content="noindex"')
	expect(result.head).not.toContain('og:')
	expect(result.body).toContain('Back to editor')
	expect(result.body).toContain(`href="${data().links.source}"`)
	expect(result.body).not.toMatch(/<th[^>]*>Source<\/th>/)
	expect(result.body.match(/<main /g)).toHaveLength(1)
})

test.each(['page', 'icon', 'share'] as const)(
	'Published %s delegates serving data and uses published assets without nested main',
	(view) => {
		const result = render(PublishedTree, { props: { data: data(), view } })
		expect(result.body.match(/<main /g)).toHaveLength(1)
		expect(result.body).toContain('src="/cdn/pieces/assets/published/cover.jpg"')
		expect(result.body).not.toContain('/admin/asset')
		expect(result.body).not.toContain('/admin/preview')
		if (view === 'page') {
			expect(result.body).toContain('data-renderer="page"')
			expect(result.body).toContain('href="/tags/fiction"')
			expect(result.body).toContain('Fiction')
		}
		if (view === 'icon') {
			expect(result.body).toContain('aria-label="Piece icon"')
			expect(result.body).toContain('data-width="500"')
			expect(result.body).toContain('loading="eager"')
		}
		if (view === 'share') {
			expect(result.body).toContain('aria-label="Share"')
			expect(result.body).toContain('data-renderer="composition"')
			expect(result.body).not.toContain('Rendered share composition')
			expect(result.body).not.toContain('not the generated PNG')
			expect(result.body).not.toContain('Open generated share image')
		}
	}
)
