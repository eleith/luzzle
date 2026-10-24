import { beforeEach, expect, test, vi } from 'vitest'
import { load } from './+page.server'

const { config, getPiecesForTagFeed, loadPageMarkdown } = vi.hoisted(() => ({
	config: {
		url: { app: 'https://garden.example/base' },
		pages: { feed: { about: undefined as string | undefined, links: true } }
	},
	getPiecesForTagFeed: vi.fn(),
	loadPageMarkdown: vi.fn()
}))
vi.mock('$lib/server/config', () => ({ config }))
vi.mock('$lib/feeds/utils', () => ({ getPiecesForTagFeed }))
vi.mock('$lib/server/pages.js', () => ({ loadPageMarkdown }))
const pieces = [{ id: 'note', type: 'field-notes', title: 'A note', assets: [] }]
function event(tag = 'field-notes') {
	return { params: { tag } } as Parameters<typeof load>[0]
}
beforeEach(() => {
	vi.clearAllMocks()
	config.url.app = 'https://garden.example/base'
	config.pages.feed = { about: undefined, links: true }
	getPiecesForTagFeed.mockResolvedValue(pieces)
	loadPageMarkdown.mockResolvedValue(undefined)
})

test('retains tag data and metadata without selecting a prepared bundle', async () => {
	expect(await load(event())).toEqual({
		pieces,
		tag: 'field-notes',
		meta: {
			title: 'RSS feed | tag: field-notes',
			description: 'an RSS feed for pieces tagged with field-notes'
		},
		feed: {
			url: 'https://garden.example/base/rss/tags/field-notes/feed.xml',
			type: 'tag',
			label: 'field-notes'
		},
		about: undefined,
		links: true
	})
	expect(getPiecesForTagFeed).toHaveBeenCalledExactlyOnceWith('field-notes')
	expect(loadPageMarkdown).toHaveBeenCalledExactlyOnceWith(undefined)
})

test.each(['', 'unknown-tag'])('tag %j with no records keeps a useful empty feed', async (tag) => {
	getPiecesForTagFeed.mockResolvedValue([])
	expect(await load(event(tag))).toMatchObject({
		pieces: [],
		tag,
		feed: { url: `https://garden.example/base/rss/tags/${tag}/feed.xml`, type: 'tag', label: tag }
	})
})

test.each(['https://garden.example/base', '', '/garden'])(
	'preserves app base %j and encodes tag segments',
	async (app) => {
		config.url.app = app
		expect(await load(event('field / notes & café?#%'))).toMatchObject({
			feed: { url: `${app}/rss/tags/field%20%2F%20notes%20%26%20caf%C3%A9%3F%23%25/feed.xml` }
		})
	}
)

test('the about card can be enabled while subscription controls are hidden', async () => {
	config.pages.feed = { about: 'feed.md', links: false }
	loadPageMarkdown.mockResolvedValue('<h2>About</h2>')
	expect(await load(event())).toMatchObject({ about: '<h2>About</h2>', links: false, pieces })
})

test('query and Markdown failures propagate rather than displaying fallback output', async () => {
	const failure = new Error('tag query failed')
	getPiecesForTagFeed.mockRejectedValueOnce(failure)
	await expect(load(event())).rejects.toBe(failure)
	expect(loadPageMarkdown).not.toHaveBeenCalled()
	getPiecesForTagFeed.mockResolvedValue(pieces)
	loadPageMarkdown.mockRejectedValueOnce(failure)
	await expect(load(event())).rejects.toBe(failure)
})
