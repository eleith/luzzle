import { beforeEach, expect, test, vi } from 'vitest'
import { load } from './+page.server'

const { config, getPiecesForTagFeed, renderPreparedFeedPage } = vi.hoisted(() => ({
	config: { url: { app: 'https://garden.example/base' } },
	getPiecesForTagFeed: vi.fn(),
	renderPreparedFeedPage: vi.fn()
}))
vi.mock('$lib/server/config', () => ({ config }))
vi.mock('$lib/feeds/utils', () => ({ getPiecesForTagFeed }))
vi.mock('$lib/feeds/page.server.js', () => ({ renderPreparedFeedPage }))

const pieces = [{ id: 'note', type: 'field-notes', title: 'A note', assets: [] }]
const presentation = {
	revision: 'tag-feed-revision',
	body: '<article>Prepared tag feed</article>',
	head: '<title>Prepared tag feed</title><style data-prepared-theme>/* feed */</style>',
	navBanner: { background: 'var(--color-primary)' }
}

function event(tag = 'field-notes') {
	return {
		params: { tag },
		url: new URL('https://request.example/rss/tags/field-notes/feed.html?view=recent'),
		parent: vi.fn(() => {
			throw new Error('feed config must not depend on parent data')
		})
	} as unknown as Parameters<typeof load>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	config.url.app = 'https://garden.example/base'
	getPiecesForTagFeed.mockResolvedValue(pieces)
	renderPreparedFeedPage.mockResolvedValue(presentation)
})

test('retains tag data and metadata and forwards the actual request context', async () => {
	const request = event()
	const feed = {
		url: 'https://garden.example/base/rss/tags/field-notes/feed.xml',
		type: 'tag',
		label: 'field-notes'
	}
	const result = await load(request)
	expect(result).toEqual({
		pieces,
		tag: 'field-notes',
		meta: {
			title: 'RSS feed | tag: field-notes',
			description: 'an RSS feed for pieces tagged with field-notes'
		},
		feed,
		presentation
	})
	expect(getPiecesForTagFeed).toHaveBeenCalledExactlyOnceWith('field-notes')
	expect(renderPreparedFeedPage).toHaveBeenCalledExactlyOnceWith({
		feed,
		pieces,
		url: request.url
	})
	expect(renderPreparedFeedPage.mock.calls[0][0].url).toBe(request.url)
	expect(result && result.presentation).toBe(presentation)
	expect(JSON.parse(JSON.stringify(result))).toEqual(result)
	expect(request.parent).not.toHaveBeenCalled()
})

test.each(['', 'unknown-tag'])(
	'tag %j with no matching pieces still returns a prepared empty feed',
	async (tag) => {
		getPiecesForTagFeed.mockResolvedValue([])
		const request = event(tag)
		const feed = {
			url: `https://garden.example/base/rss/tags/${tag}/feed.xml`,
			type: 'tag',
			label: tag
		}
		expect(await load(request)).toEqual({
			pieces: [],
			tag,
			meta: {
				title: `RSS feed | tag: ${tag}`,
				description: `an RSS feed for pieces tagged with ${tag}`
			},
			feed,
			presentation
		})
		expect(getPiecesForTagFeed).toHaveBeenCalledExactlyOnceWith(tag)
		expect(renderPreparedFeedPage).toHaveBeenCalledExactlyOnceWith({
			feed,
			pieces: [],
			url: request.url
		})
	}
)

test.each(['https://garden.example/base', '', '/garden'])(
	'preserves configured app base %j and encodes only the tag URL segment',
	async (app) => {
		config.url.app = app
		const tag = 'field / notes & café?#%'
		const request = event(tag)
		const feed = {
			url: `${app}/rss/tags/field%20%2F%20notes%20%26%20caf%C3%A9%3F%23%25/feed.xml`,
			type: 'tag',
			label: tag
		}
		expect(await load(request)).toMatchObject({
			tag,
			feed,
			meta: {
				title: `RSS feed | tag: ${tag}`,
				description: `an RSS feed for pieces tagged with ${tag}`
			}
		})
		expect(getPiecesForTagFeed).toHaveBeenCalledExactlyOnceWith(tag)
		expect(renderPreparedFeedPage).toHaveBeenCalledExactlyOnceWith({
			feed,
			pieces,
			url: request.url
		})
	}
)

test('returns the helper-owned null presentation without changing feed data', async () => {
	renderPreparedFeedPage.mockResolvedValue(null)
	expect(await load(event())).toMatchObject({ pieces, tag: 'field-notes', presentation: null })
	expect(renderPreparedFeedPage).toHaveBeenCalledOnce()
})

test('query failures propagate before presentation instead of becoming fallback', async () => {
	const failure = new Error('tag feed query failed')
	getPiecesForTagFeed.mockRejectedValueOnce(failure)
	await expect(load(event())).rejects.toBe(failure)
	expect(renderPreparedFeedPage).not.toHaveBeenCalled()
})

test('leaves presentation fallback policy to the helper', async () => {
	const failure = new Error('unexpected preparation failure')
	renderPreparedFeedPage.mockRejectedValueOnce(failure)
	await expect(load(event())).rejects.toBe(failure)
	expect(getPiecesForTagFeed).toHaveBeenCalledExactlyOnceWith('field-notes')
})
