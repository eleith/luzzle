import { beforeEach, expect, test, vi } from 'vitest'
import { load } from './+page.server.js'

const { config, db, getRecentPieces, getRandomPieces, hydrateWithAssets, loadPageMarkdown } =
	vi.hoisted(() => ({
		config: {
			pieces: [{ type: 'inventory' }],
			pages: { home: { body: undefined as string | undefined, latest: true, random: false } }
		},
		db: {},
		getRecentPieces: vi.fn(),
		getRandomPieces: vi.fn(),
		hydrateWithAssets: vi.fn(),
		loadPageMarkdown: vi.fn()
	}))
vi.mock('$lib/server/config', () => ({ config }))
vi.mock('$lib/server/database', () => ({ db }))
vi.mock('$lib/server/pieces', () => ({ getRecentPieces, getRandomPieces }))
vi.mock('$lib/pieces/assets.server', () => ({ hydrateWithAssets }))
vi.mock('$lib/server/pages.js', () => ({ loadPageMarkdown }))
const recent = [{ id: 'one', title: 'Latest' }]
const random = [{ id: 'two', title: 'Random' }]

beforeEach(() => {
	vi.clearAllMocks()
	config.pages.home = { body: undefined, latest: true, random: false }
	getRecentPieces.mockResolvedValue(recent)
	getRandomPieces.mockResolvedValue(random)
	hydrateWithAssets.mockImplementation(async (pieces) => pieces)
	loadPageMarkdown.mockResolvedValue(undefined)
})
const event = {} as Parameters<typeof load>[0]

test('stock home uses published latest pieces and does not request random data', async () => {
	expect(await load(event)).toEqual({
		types: ['inventory'],
		body: undefined,
		latest: recent,
		random: []
	})
	expect(getRecentPieces).toHaveBeenCalledExactlyOnceWith(db, 5, ['inventory'])
	expect(getRandomPieces).not.toHaveBeenCalled()
})

test('Markdown body does not replace dynamic lists and random excludes latest IDs', async () => {
	config.pages.home.body = 'home.md'
	config.pages.home.random = true
	loadPageMarkdown.mockResolvedValue('<h1>Welcome</h1>')
	expect(await load(event)).toMatchObject({ body: '<h1>Welcome</h1>', latest: recent, random })
	expect(loadPageMarkdown).toHaveBeenCalledExactlyOnceWith('home.md')
	expect(getRandomPieces).toHaveBeenCalledExactlyOnceWith(db, 5, ['inventory'], ['one'])
})

test('disabled lists skip piece queries and delegate empty collections to hydration', async () => {
	config.pages.home.latest = false
	expect(await load(event)).toMatchObject({ latest: [], random: [] })
	expect(getRecentPieces).not.toHaveBeenCalled()
	expect(getRandomPieces).not.toHaveBeenCalled()
	expect(hydrateWithAssets.mock.calls).toEqual([[[]], [[]]])
})

test('random works independently of latest and delegates empty collections to hydration', async () => {
	config.pages.home.latest = false
	config.pages.home.random = true
	getRandomPieces.mockResolvedValue([])
	expect(await load(event)).toMatchObject({ latest: [], random: [] })
	expect(getRandomPieces).toHaveBeenCalledExactlyOnceWith(db, 5, ['inventory'], [])
	expect(hydrateWithAssets.mock.calls).toEqual([[[]], [[]]])
})
