import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import type { PageTemplateHelpers } from '@luzzle/web.templates/helpers'
import { config } from './config.js'
import type { LoadedTemplateBundle } from './templates.js'
import { renderPreparedPiecePage } from './piece-page.js'

const { loadTemplateBundle } = vi.hoisted(() => ({ loadTemplateBundle: vi.fn() }))
vi.mock('./templates.js', () => ({ loadTemplateBundle }))
vi.mock('./config.js', async () => {
	const { makeConfig } = await import('./config.fixture.js')
	const config = makeConfig()
	config.paths.config = '/deployment/garden/config.yaml'
	config.paths.prepared = '../prepared'
	config.paths.static = '../shared/static'
	config.url.app = 'https://public.example/garden/?discard=1#fragment'
	config.url.luzzle_assets = 'https://cdn.example/media/?discard=1#fragment'
	config.url.app_assets = 'https://static.example/site/?discard=1#fragment'
	return { config }
})

const defaults = structuredClone(config)
const tags = [{ slug: 'fiction', tag: 'Fiction' }]
const colors = {
	background: 'var(--color-primary)',
	color: 'var(--color-on-primary)',
	hoverColor: 'var(--color-secondary)'
}
const captured: PageTemplateHelpers[] = []
let bundle: LoadedTemplateBundle
let logged: ReturnType<typeof vi.spyOn>

function piece(): PublicWebPiece {
	return {
		id: 'piece-id',
		key: 'piece-key',
		title: 'A piece',
		slug: 'a piece #?%',
		type: 'custom-kind',
		date_added: 1,
		metadata: { cover: 'cover' },
		keywords: '[]',
		assets: [
			{
				asset_key: 'cover',
				transformation: 'image.original',
				asset_path: 'custom-kind/cover key/original.jpg',
				mime_type: 'image/jpeg'
			},
			{
				asset_key: 'cover',
				transformation: 'image.s.webp',
				asset_path: 'custom-kind/cover key/small.webp',
				mime_type: 'image/webp'
			},
			{
				asset_key: 'cover',
				transformation: 'palette',
				content: '{"accent":"#123456"}',
				mime_type: 'application/json'
			},
			{
				asset_key: 'piece-key',
				transformation: 'markdown',
				content: '<p>Prepared note</p>',
				mime_type: 'text/html'
			}
		]
	}
}

function request(previewJob?: string) {
	return {
		piece: piece(),
		tags,
		url: new URL('https://request.example/admin/path?draft=1'),
		previewJob
	}
}

function makeBundle(revision: string): LoadedTemplateBundle {
	return {
		revision,
		themeCss: `/* theme ${revision} */`,
		templateLookup: { pieces: { 'custom-kind': { page: 'custom-page' } }, site: {} },
		render: vi.fn((_name: string, props: object) => {
			const { helpers } = props as { helpers: PageTemplateHelpers }
			captured.push(helpers)
			helpers.showNavBanner(colors)
			return { body: `<main>${revision}</main>`, head: `<title>${revision}</title>` }
		})
	}
}

beforeEach(() => {
	vi.resetAllMocks()
	Object.assign(config, structuredClone(defaults))
	captured.length = 0
	bundle = makeBundle('first')
	loadTemplateBundle.mockResolvedValue(bundle)
	logged = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => vi.restoreAllMocks())

describe('renderPreparedPiecePage unit boundary', () => {
	test('does not load deployment output without config filename metadata', async () => {
		config.paths.config = ''
		expect(await renderPreparedPiecePage(request())).toBeNull()
		expect(loadTemplateBundle).not.toHaveBeenCalled()
		expect(logged).not.toHaveBeenCalled()
	})

	test('a missing selected bundle leaves the existing page available', async () => {
		loadTemplateBundle.mockResolvedValue(null)
		expect(await renderPreparedPiecePage(request())).toBeNull()
		expect(bundle.render).not.toHaveBeenCalled()
		expect(logged).not.toHaveBeenCalled()
	})

	test.each(['missing-kind', '__proto__', 'constructor', 'toString'])(
		'ignores an inherited piece selector for %s',
		async (type) => {
			bundle.templateLookup.pieces = Object.create({ [type]: { page: 'inherited-page' } })
			const input = request()
			input.piece.type = type
			expect(await renderPreparedPiecePage(input)).toBeNull()
			expect(bundle.render).not.toHaveBeenCalled()
			expect(logged).not.toHaveBeenCalled()
		}
	)

	test.each([{}, { icon: 'icon' }, { page: '' }, Object.create({ page: 'inherited-page' })])(
		'requires an own nonempty page selector: %j',
		async (selector) => {
			bundle.templateLookup.pieces['custom-kind'] = selector
			expect(await renderPreparedPiecePage(request())).toBeNull()
			expect(bundle.render).not.toHaveBeenCalled()
			expect(logged).not.toHaveBeenCalled()
		}
	)

	test('allows an explicit prototype-named piece type from JSON', async () => {
		bundle.templateLookup.pieces = JSON.parse('{"__proto__":{"page":"own-page"}}')
		const input = request()
		input.piece.type = '__proto__'
		expect(await renderPreparedPiecePage(input)).not.toBeNull()
		expect(bundle.render).toHaveBeenCalledWith(
			'own-page',
			expect.objectContaining({ data: { piece: input.piece, tags } })
		)
	})

	test('passes serving data through the real helper factory and returns only serializable presentation', async () => {
		const input = request()
		const before = structuredClone(input.piece)
		const result = await renderPreparedPiecePage(input)
		expect(loadTemplateBundle).toHaveBeenCalledExactlyOnceWith('/deployment/prepared')
		expect(bundle.render).toHaveBeenCalledExactlyOnceWith('custom-page', {
			data: { piece: input.piece, tags },
			helpers: captured[0]
		})
		expect(result).toEqual({
			revision: 'first',
			body: '<main>first</main>',
			head: '<title>first</title><style data-prepared-theme>/* theme first */</style>',
			navBanner: colors
		})
		expect(JSON.parse(JSON.stringify(result))).toEqual(result)
		expect(Object.keys(result!).sort()).toEqual(['body', 'head', 'navBanner', 'revision'])
		expect(input.piece).toEqual(before)
		expect(logged).not.toHaveBeenCalled()
	})

	test('retains base piece, image, palette and inline content helper semantics', async () => {
		const input = request()
		await renderPreparedPiecePage(input)
		const bound = captured[0].forPiece(input.piece)
		expect(bound.getUrl()).toBe(
			'https://public.example/garden/pieces/custom-kind/a%20piece%20%23%3F%25'
		)
		expect(bound.getImageUrl('cover', 125, 'webp')).toBe(
			'https://cdn.example/media/pieces/assets/custom-kind/cover%20key/small.webp'
		)
		expect(bound.getImageUrl('cover', 126, 'webp')).toBe(
			'https://cdn.example/media/pieces/assets/custom-kind/cover%20key/original.jpg'
		)
		expect(bound.getAssetUrl('cover', 'image.original')).toBe(
			bound.getImageUrl('cover', 500, 'jpg')
		)
		expect(bound.getPalette()).toEqual({ accent: '#123456' })
		expect(bound.getAssetContent('piece-key', 'markdown')).toBe('<p>Prepared note</p>')
		expect(bound.getImageUrl('missing', 125, 'jpg')).toBeUndefined()
		expect(bound.getAssetContent('missing', 'markdown')).toBeUndefined()
	})

	test('resolves relative application URLs against the request origin and falls back from CDN to app', async () => {
		config.url.app = '/garden/'
		config.url.luzzle_assets = ''
		const input = request()
		input.piece.type = 'custom/kind'
		bundle.templateLookup.pieces['custom/kind'] = { page: 'custom-page' }
		await renderPreparedPiecePage(input)
		const bound = captured[0].forPiece(input.piece)
		expect(bound.getUrl()).toBe(
			'https://request.example/garden/pieces/custom%2Fkind/a%20piece%20%23%3F%25'
		)
		expect(bound.getImageUrl('cover', 125, 'jpg')).toBe(
			'/garden/pieces/assets/custom-kind/cover%20key/original.jpg'
		)
	})

	test('captured helpers keep published, job1 and job2 URL contexts independent after awaits', async () => {
		const source = piece()
		await renderPreparedPiecePage(request())
		await renderPreparedPiecePage(request('job 1'))
		await Promise.resolve()
		await renderPreparedPiecePage(request('job 2'))
		const [published, first, second] = captured.map((helpers) => helpers.forPiece(source))
		expect(first.getImageUrl('cover', 125, 'jpg')).toBe(
			'/admin/preview/job%201/asset/custom-kind/cover%20key/original.jpg'
		)
		expect(second.getAssetUrl('cover', 'image.original')).toBe(
			'/admin/preview/job%202/asset/custom-kind/cover%20key/original.jpg'
		)
		expect(published.getAssetUrl('cover', 'image.original')).toBe(
			'https://cdn.example/media/pieces/assets/custom-kind/cover%20key/original.jpg'
		)
		expect(first.getUrl()).toBe(published.getUrl())
		expect(second.getUrl()).toBe(published.getUrl())
		expect(first.getPalette()).toEqual(published.getPalette())
		expect(first.getAssetContent('piece-key', 'markdown')).toBe('<p>Prepared note</p>')
		expect(source).toEqual(piece())
	})

	test('pins one loaded module and its matching theme for each render', async () => {
		const second = makeBundle('second')
		loadTemplateBundle.mockResolvedValueOnce(bundle).mockResolvedValue(second)
		const firstResult = await renderPreparedPiecePage(request())
		expect(loadTemplateBundle).toHaveBeenCalledTimes(1)
		expect(second.render).not.toHaveBeenCalled()
		const secondResult = await renderPreparedPiecePage(request())
		expect(loadTemplateBundle).toHaveBeenCalledTimes(2)
		expect(firstResult).toMatchObject({
			revision: 'first',
			body: '<main>first</main>',
			head: '<title>first</title><style data-prepared-theme>/* theme first */</style>'
		})
		expect(secondResult).toMatchObject({
			revision: 'second',
			body: '<main>second</main>',
			head: '<title>second</title><style data-prepared-theme>/* theme second */</style>'
		})
	})

	test('does not leak a previous request banner when the next template does not request one', async () => {
		const first = await renderPreparedPiecePage(request())
		vi.mocked(bundle.render).mockReturnValueOnce({ body: 'plain', head: '' })
		const second = await renderPreparedPiecePage(request())
		expect(first?.navBanner).toEqual(colors)
		expect(second?.navBanner).toBeNull()
		expect(second?.body).toBe('plain')
	})

	test.each(['module import', 'theme CSS read'])(
		'logs %s errors and falls back without partial presentation',
		async (stage) => {
			const failure = new Error(`${stage} failed`)
			loadTemplateBundle.mockRejectedValueOnce(failure)
			expect(await renderPreparedPiecePage(request())).toBeNull()
			expect(bundle.render).not.toHaveBeenCalled()
			expect(logged).toHaveBeenCalledExactlyOnceWith(
				'Prepared page rendering failed for custom-kind',
				failure
			)
		}
	)

	test('discards body, styles and captured navigation on render failure and isolates the next request', async () => {
		const failure = new Error('template failed after navigation capture')
		const input = request()
		const original = structuredClone({ piece: input.piece, tags: input.tags })
		vi.mocked(bundle.render).mockImplementationOnce((_name, props) => {
			const { helpers, data } = props as {
				helpers: PageTemplateHelpers
				data: { piece: PublicWebPiece; tags: typeof tags }
			}
			helpers.showNavBanner(colors)
			data.piece.title = 'partial template mutation'
			data.piece.assets.length = 0
			data.tags.length = 0
			throw failure
		})
		expect(await renderPreparedPiecePage(input)).toBeNull()
		expect({ piece: input.piece, tags: input.tags }).toEqual(original)
		expect(logged).toHaveBeenCalledExactlyOnceWith(
			'Prepared page rendering failed for custom-kind',
			failure
		)
		vi.mocked(bundle.render).mockReturnValueOnce({ body: 'recovered', head: '' })
		expect(await renderPreparedPiecePage(request())).toEqual({
			revision: 'first',
			body: 'recovered',
			head: '<style data-prepared-theme>/* theme first */</style>',
			navBanner: null
		})
	})
})

describe('static asset builder through real page helpers', () => {
	test('constructs static URLs without promising the files are published', async () => {
		await renderPreparedPiecePage(request())
		expect(captured[0].getStaticAssetUrl('images/favicon.png')).toBe(
			'https://static.example/site/images/favicon.png'
		)
		expect(captured[0].getStaticAssetUrl('images/owner-only.svg')).toBe(
			'https://static.example/site/images/owner-only.svg'
		)
		expect(captured[0].getStaticAssetUrl('images')).toBe('https://static.example/site/images')
	})

	test('keeps captured static URL bases stable between requests', async () => {
		await renderPreparedPiecePage(request())
		config.url.app_assets = '/new-base'
		await renderPreparedPiecePage(request())
		expect(captured[0].getStaticAssetUrl('images/favicon.png')).toBe(
			'https://static.example/site/images/favicon.png'
		)
		expect(captured[1].getStaticAssetUrl('images/favicon.png')).toBe('/new-base/images/favicon.png')
	})

	test.each([
		'',
		'../secret',
		'/absolute.svg',
		'a/../secret',
		'a/./mark.svg',
		'a//mark.svg',
		'a\\mark.svg',
		'images/mark\0.svg',
		'https://other.example/mark.svg'
	])('leaves invalid static paths unavailable: %j', async (relative) => {
		await renderPreparedPiecePage(request())
		expect(captured[0].getStaticAssetUrl(relative)).toBeUndefined()
	})
})
