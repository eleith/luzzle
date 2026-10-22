import { beforeEach, expect, test, vi } from 'vitest'
import { load } from './+page.server'

const { config, getPiecesForFeed, renderPreparedFeedPage } = vi.hoisted(() => ({
	config: {
		pieces: [{ type: 'field-notes' }, { type: 'specimens' }, { type: 'field / notes & café' }],
		url: { app: 'https://garden.example/base' }
	},
	getPiecesForFeed: vi.fn(),
	renderPreparedFeedPage: vi.fn()
}))
vi.mock('$lib/server/config', () => ({ config }))
vi.mock('$lib/feeds/utils', () => ({ getPiecesForFeed }))
vi.mock('$lib/feeds/page.server.js', () => ({ renderPreparedFeedPage }))

const pieces = [{ id: 'note', type: 'field-notes', title: 'A note', assets: [] }]
const presentation = {
	revision: 'feed-revision',
	body: '<article>Prepared feed</article>',
	head: '<title>Prepared feed</title><style data-prepared-theme>/* feed */</style>',
	navBanner: { background: 'var(--color-primary)' }
}

function event(type?: string) {
	return {
		params: { piece: type },
		url: new URL('https://request.example/rss/pieces/feed.html?view=recent'),
		parent: vi.fn(() => {
			throw new Error('feed config must not depend on parent data')
		})
	} as unknown as Parameters<typeof load>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	config.url.app = 'https://garden.example/base'
	getPiecesForFeed.mockResolvedValue(pieces)
	renderPreparedFeedPage.mockResolvedValue(presentation)
})

test.each(config.pieces.map(({ type }) => type))(
	'HTML feeds accept runtime-configured %s and retain metadata',
	async (type) => {
		const request = event(type)
		const feed = {
			url: `https://garden.example/base/rss/pieces/${encodeURIComponent(type)}/feed.xml`,
			type: 'piece',
			label: type
		}
		const result = await load(request)
		expect(result).toEqual({
			pieces,
			type,
			meta: { title: `RSS feed | ${type}`, description: `an RSS feed for ${type}` },
			feed,
			presentation
		})
		expect(getPiecesForFeed).toHaveBeenCalledExactlyOnceWith(type)
		expect(renderPreparedFeedPage).toHaveBeenCalledExactlyOnceWith({
			feed,
			pieces,
			url: request.url
		})
		expect(renderPreparedFeedPage.mock.calls[0][0].url).toBe(request.url)
		expect(result && result.presentation).toBe(presentation)
		expect(JSON.parse(JSON.stringify(result))).toEqual(result)
		expect(request.parent).not.toHaveBeenCalled()
	}
)

test.each([undefined, ''])('optional type %s retains the all-pieces feed', async (type) => {
	const request = event(type)
	const feed = {
		url: 'https://garden.example/base/rss/pieces/feed.xml',
		type: 'piece',
		label: 'all'
	}
	expect(await load(request)).toEqual({
		pieces,
		type,
		meta: { title: 'RSS feed | all', description: 'RSS feed for all pieces' },
		feed,
		presentation
	})
	expect(getPiecesForFeed).toHaveBeenCalledExactlyOnceWith(type)
	expect(renderPreparedFeedPage).toHaveBeenCalledExactlyOnceWith({
		feed,
		pieces,
		url: request.url
	})
	expect(request.parent).not.toHaveBeenCalled()
})

test('unknown types fail before collecting pieces or preparing presentation', async () => {
	await expect(load(event('unconfigured'))).rejects.toMatchObject({ status: 404 })
	expect(getPiecesForFeed).not.toHaveBeenCalled()
	expect(renderPreparedFeedPage).not.toHaveBeenCalled()
})

test.each(['', '/garden'])(
	'preserves configured app base %j and encodes the filter',
	async (app) => {
		config.url.app = app
		expect(await load(event('field / notes & café'))).toMatchObject({
			feed: {
				url: `${app}/rss/pieces/field%20%2F%20notes%20%26%20caf%C3%A9/feed.xml`,
				type: 'piece',
				label: 'field / notes & café'
			}
		})
	}
)

test('returns the helper-owned null presentation without changing feed data', async () => {
	renderPreparedFeedPage.mockResolvedValue(null)
	expect(await load(event('field-notes'))).toMatchObject({
		pieces,
		type: 'field-notes',
		presentation: null
	})
	expect(renderPreparedFeedPage).toHaveBeenCalledOnce()
})

test('query failures propagate before presentation instead of becoming fallback', async () => {
	const failure = new Error('feed query failed')
	getPiecesForFeed.mockRejectedValueOnce(failure)
	await expect(load(event('field-notes'))).rejects.toBe(failure)
	expect(renderPreparedFeedPage).not.toHaveBeenCalled()
})

test('leaves presentation fallback policy to the helper', async () => {
	const failure = new Error('unexpected preparation failure')
	renderPreparedFeedPage.mockRejectedValueOnce(failure)
	await expect(load(event('field-notes'))).rejects.toBe(failure)
	expect(getPiecesForFeed).toHaveBeenCalledExactlyOnceWith('field-notes')
})
