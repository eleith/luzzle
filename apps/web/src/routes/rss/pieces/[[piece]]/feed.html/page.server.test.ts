import { beforeEach, expect, test, vi } from 'vitest'
import { load } from './+page.server'

const { config, getPiecesForFeed, loadPageMarkdown } = vi.hoisted(() => ({
	config: {
		pieces: [{ type: 'field-notes' }, { type: 'specimens' }, { type: 'field / notes & café' }],
		url: { app: 'https://garden.example/base' },
		pages: { feed: { about: undefined as string | undefined, links: true } }
	},
	getPiecesForFeed: vi.fn(),
	loadPageMarkdown: vi.fn()
}))
vi.mock('$lib/server/config', () => ({ config }))
vi.mock('$lib/feeds/utils', () => ({ getPiecesForFeed }))
vi.mock('$lib/server/pages.js', () => ({ loadPageMarkdown }))
const pieces = [{ id: 'note', type: 'field-notes', title: 'A note', assets: [] }]

function event(type?: string) {
	return { params: { piece: type } } as Parameters<typeof load>[0]
}
beforeEach(() => {
	vi.clearAllMocks()
	config.url.app = 'https://garden.example/base'
	config.pages.feed = { about: undefined, links: true }
	getPiecesForFeed.mockResolvedValue(pieces)
	loadPageMarkdown.mockResolvedValue(undefined)
})

test.each(config.pieces.map(({ type }) => type))(
	'HTML feed %s retains metadata without a prepared bundle',
	async (type) => {
		const result = await load(event(type))
		expect(result).toEqual({
			pieces,
			type,
			meta: { title: `RSS feed | ${type}`, description: `an RSS feed for ${type}` },
			feed: {
				url: `https://garden.example/base/rss/pieces/${encodeURIComponent(type)}/feed.xml`,
				type: 'piece',
				label: type
			},
			about: undefined,
			links: true
		})
		expect(getPiecesForFeed).toHaveBeenCalledExactlyOnceWith(type)
		expect(loadPageMarkdown).toHaveBeenCalledExactlyOnceWith(undefined)
	}
)

test.each([undefined, ''])('optional type %s retains the all-pieces feed', async (type) => {
	expect(await load(event(type))).toMatchObject({
		pieces,
		type,
		meta: { title: 'RSS feed | all', description: 'RSS feed for all pieces' },
		feed: { url: 'https://garden.example/base/rss/pieces/feed.xml', type: 'piece', label: 'all' }
	})
})

test('about Markdown and subscription controls are independent', async () => {
	config.pages.feed = { about: 'feed.md', links: false }
	loadPageMarkdown.mockResolvedValue('<p>About this feed</p>')
	expect(await load(event())).toMatchObject({
		pieces,
		about: '<p>About this feed</p>',
		links: false
	})
	expect(loadPageMarkdown).toHaveBeenCalledExactlyOnceWith('feed.md')
})

test('unknown types fail before collecting pieces or loading Markdown', async () => {
	await expect(load(event('unconfigured'))).rejects.toMatchObject({ status: 404 })
	expect(getPiecesForFeed).not.toHaveBeenCalled()
	expect(loadPageMarkdown).not.toHaveBeenCalled()
})

test.each(['', '/garden'])(
	'preserves configured app base %j and encodes the filter',
	async (app) => {
		config.url.app = app
		expect(await load(event('field / notes & café'))).toMatchObject({
			feed: { url: `${app}/rss/pieces/field%20%2F%20notes%20%26%20caf%C3%A9/feed.xml` }
		})
	}
)

test('query and Markdown errors propagate instead of selecting unrelated fallback', async () => {
	const failure = new Error('feed query failed')
	getPiecesForFeed.mockRejectedValueOnce(failure)
	await expect(load(event())).rejects.toBe(failure)
	expect(loadPageMarkdown).not.toHaveBeenCalled()
	getPiecesForFeed.mockResolvedValue(pieces)
	loadPageMarkdown.mockRejectedValueOnce(failure)
	await expect(load(event())).rejects.toBe(failure)
})
