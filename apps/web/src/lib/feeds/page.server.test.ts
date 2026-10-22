import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import type { FeedPageProps } from '@luzzle/web.templates/site/props'
import { config } from '$lib/server/config'
import type { LoadedTemplateBundle } from '$lib/server/templates.js'
import { renderPreparedFeedPage } from './page.server.js'

const { loadTemplateBundle } = vi.hoisted(() => ({ loadTemplateBundle: vi.fn() }))
vi.mock('$lib/server/templates.js', () => ({ loadTemplateBundle }))
vi.mock('$lib/server/config', async () => {
	const { makeConfig } = await import('$lib/server/config.fixture.js')
	const config = makeConfig()
	config.paths.config = '/deployment/garden/config.yaml'
	config.paths.prepared = '../prepared'
	config.url.app = 'https://public.example/garden/?discard=1#fragment'
	config.url.luzzle_assets = 'https://cdn.example/media/'
	config.url.app_assets = 'https://static.example/site/'
	return { config }
})

const defaults = structuredClone(config)
type RenderProps = Pick<FeedPageProps, 'data' | 'helpers'>
let captured: RenderProps[]
let bundle: LoadedTemplateBundle
let logged: ReturnType<typeof vi.spyOn>

function piece(): PublicWebPiece {
	return {
		id: 'note-id',
		key: 'note-key',
		slug: 'a note #?%',
		type: 'field-notes',
		title: 'A note',
		date_added: 1,
		metadata: { cover: 'cover-key' },
		assets: [
			{
				asset_key: 'cover-key',
				transformation: 'image.s.png',
				asset_path: 'notes/cover small.png',
				mime_type: 'image/png'
			}
		]
	}
}

function request() {
	return {
		feed: { type: 'tag' as const, label: 'field notes', url: '/rss/tags/field%20notes/feed.xml' },
		pieces: [piece()],
		url: new URL('https://request.example/rss/tags/field%20notes/feed.html')
	}
}

function makeBundle(revision: string): LoadedTemplateBundle {
	return {
		revision,
		themeCss: `/* ${revision} theme */`,
		templateLookup: { pieces: {}, site: { feed: 'owner-feed' } },
		render: vi.fn((_name: string, props: object) => {
			const input = props as RenderProps
			captured.push(input)
			input.helpers.showNavBanner({ background: '#123456' })
			return { body: `<main>${revision}</main>`, head: `<style>.feed-${revision}{}</style>` }
		})
	}
}

beforeEach(() => {
	vi.resetAllMocks()
	Object.assign(config, structuredClone(defaults))
	captured = []
	bundle = makeBundle('first')
	loadTemplateBundle.mockResolvedValue(bundle)
	logged = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

test('keeps the built-in available without deployment metadata or a selected bundle', async () => {
	config.paths.config = ''
	expect(await renderPreparedFeedPage(request())).toBeNull()
	expect(loadTemplateBundle).not.toHaveBeenCalled()
	Object.assign(config, structuredClone(defaults))
	loadTemplateBundle.mockResolvedValue(null)
	expect(await renderPreparedFeedPage(request())).toBeNull()
	expect(bundle.render).not.toHaveBeenCalled()
	expect(logged).not.toHaveBeenCalled()
})

test.each([{}, { root: 'root' }, { feed: '' }, Object.create({ feed: 'inherited' })])(
	'requires an own nonempty site.feed selector: %j',
	async (site) => {
		bundle.templateLookup.site = site
		expect(await renderPreparedFeedPage(request())).toBeNull()
		expect(bundle.render).not.toHaveBeenCalled()
		expect(logged).not.toHaveBeenCalled()
	}
)

test('pins the selected module/theme and returns only serializable presentation', async () => {
	const input = request()
	const result = await renderPreparedFeedPage(input)
	expect(loadTemplateBundle).toHaveBeenCalledExactlyOnceWith('/deployment/prepared')
	expect(bundle.render).toHaveBeenCalledExactlyOnceWith('owner-feed', {
		data: { feed: input.feed, pieces: input.pieces },
		helpers: captured[0].helpers
	})
	expect(captured[0].data.feed).not.toBe(input.feed)
	expect(captured[0].data.pieces).not.toBe(input.pieces)
	expect(result).toEqual({
		revision: 'first',
		body: '<main>first</main>',
		head: '<style>.feed-first{}</style><style data-prepared-theme>/* first theme */</style>',
		navBanner: { background: '#123456' }
	})
	expect(JSON.parse(JSON.stringify(result))).toEqual(result)
	expect(logged).not.toHaveBeenCalled()
})

test('binds real public piece/image/static helpers, never preview URL context', async () => {
	await renderPreparedFeedPage(request())
	const { helpers, data } = captured[0]
	const bound = helpers.forPiece(data.pieces[0])
	expect(bound.getUrl()).toBe(
		'https://public.example/garden/pieces/field-notes/a%20note%20%23%3F%25'
	)
	expect(bound.getImageUrl('cover-key', 125, 'png')).toBe(
		'https://cdn.example/media/pieces/assets/notes/cover%20small.png'
	)
	expect(helpers.getStaticAssetUrl('images/mark.svg')).toBe(
		'https://static.example/site/images/mark.svg'
	)
	expect(helpers.getStaticAssetUrl('../private')).toBeUndefined()
})

test('each request keeps its own origin and navigation, while later requests select newer output', async () => {
	config.url.app = '/garden/'
	config.url.luzzle_assets = ''
	const second = makeBundle('second')
	second.render = vi.fn((_name: string, props: object) => {
		captured.push(props as RenderProps)
		return { body: '<main>second</main>', head: '' }
	})
	loadTemplateBundle.mockResolvedValueOnce(bundle).mockResolvedValueOnce(second)
	const firstInput = request()
	const secondInput = request()
	secondInput.url = new URL('https://second.example/rss/pieces/feed.html')
	const [first, next] = await Promise.all([
		renderPreparedFeedPage(firstInput),
		renderPreparedFeedPage(secondInput)
	])
	expect(first?.revision).toBe('first')
	expect(first?.navBanner).toEqual({ background: '#123456' })
	expect(next).toEqual({
		revision: 'second',
		body: '<main>second</main>',
		head: '<style data-prepared-theme>/* second theme */</style>',
		navBanner: null
	})
	config.url.app = 'https://changed.example'
	firstInput.url.hostname = 'changed.example'
	expect(captured[0].helpers.forPiece(piece()).getUrl()).toMatch(
		/^https:\/\/request\.example\/garden\//
	)
	expect(captured[1].helpers.forPiece(piece()).getUrl()).toMatch(
		/^https:\/\/second\.example\/garden\//
	)
})

test('navigation defaults and the last call retain the existing page-helper semantics', async () => {
	bundle.render = vi.fn((_name: string, props: object) => {
		const { helpers } = props as RenderProps
		helpers.showNavBanner({ background: '#123456' })
		helpers.showNavBanner()
		return { body: 'default navigation', head: '' }
	})
	expect((await renderPreparedFeedPage(request()))?.navBanner).toEqual({})
})

test('a throwing template cannot mutate fallback data or return partial navigation/head', async () => {
	const input = request()
	const before = structuredClone({ feed: input.feed, pieces: input.pieces })
	bundle.render = vi.fn((_name: string, props: object) => {
		const { data, helpers } = props as RenderProps
		helpers.showNavBanner({ background: '#abcdef' })
		Object.assign(data.feed, { label: 'Corrupted label' })
		data.pieces[0].metadata.cover = 'Corrupted metadata'
		throw new Error('feed owner failed')
	})
	expect(await renderPreparedFeedPage(input)).toBeNull()
	expect({ feed: input.feed, pieces: input.pieces }).toEqual(before)
	expect(logged).toHaveBeenCalledExactlyOnceWith(
		'Prepared feed rendering failed for tag: field notes',
		expect.any(Error)
	)
})

test('successful templates also receive isolated serving data', async () => {
	const input = request()
	const before = structuredClone(input.pieces)
	bundle.render = vi.fn((_name: string, props: object) => {
		const { data } = props as RenderProps
		data.pieces[0].metadata.cover = 'Owner mutation'
		return { body: 'Rendered', head: '' }
	})
	expect((await renderPreparedFeedPage(input))?.body).toBe('Rendered')
	expect(input.pieces).toEqual(before)
})

test.each(['Missing module', 'Malformed selected output', 'Filesystem failure'])(
	'load failure falls back without swallowing configuration or query work: %s',
	async (message) => {
		loadTemplateBundle.mockRejectedValue(new Error(message))
		expect(await renderPreparedFeedPage(request())).toBeNull()
		expect(bundle.render).not.toHaveBeenCalled()
		expect(logged).toHaveBeenCalledOnce()
	}
)
