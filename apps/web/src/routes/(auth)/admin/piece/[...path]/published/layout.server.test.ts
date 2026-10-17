import { beforeEach, expect, test, vi } from 'vitest'
import { MarkdownPublicationStatus } from '$lib/pieces/types'
import { load } from './+layout.server'

const {
	getWebPiece,
	getPieces,
	getStorage,
	createReadStream,
	write,
	sync,
	runWorkflow,
	config,
	query,
	db
} = vi.hoisted(() => {
	const query = {
		selectAll: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		distinct: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		execute: vi.fn(),
		executeTakeFirst: vi.fn()
	}
	return {
		query,
		db: { selectFrom: vi.fn((_table: string) => query) },
		getWebPiece: vi.fn(),
		getPieces: vi.fn(),
		getStorage: vi.fn(),
		createReadStream: vi.fn(),
		write: vi.fn(),
		sync: vi.fn(),
		runWorkflow: vi.fn(),
		config: {
			url: { app: 'https://app.example/garden/' },
			ai: { secret: 'private-ai' },
			auth: { secret: 'private-auth' },
			pieces: []
		}
	}
})
vi.mock('$app/paths', () => ({
	resolve: () => {
		throw new Error('Could not get the request store. This is an internal error.')
	}
}))
vi.mock('$lib/server/database', () => ({ db }))
vi.mock('$lib/server/config', () => ({ config }))
vi.mock('$lib/server/pieces', () => ({ getWebPiece, getPieces }))
vi.mock('$lib/server/storage', () => ({ getStorage }))
vi.mock('$lib/server/workflow/index.js', () => ({ getOpenWorkflow: () => ({ runWorkflow }) }))

const file = 'old type/源 #?%.books.md'
const serving = {
	id: 'serving-id',
	key: 'serving-key',
	file_path: file,
	title: 'Published title',
	type: 'removed-schema',
	slug: 'public #?%',
	date_added: 10,
	date_updated: 20,
	json_metadata: JSON.stringify({ title: 'Published metadata' }),
	content_hash: 'completed-hash',
	last_published_at: 1234
}
const tags = [{ slug: 'fiction', tag: 'Fiction' }]
function event() {
	return {
		params: { path: file },
		url: new URL(
			'https://admin.example/admin/piece/old%20type/%E6%BA%90%20%23%3F%25.books.md/published'
		),
		route: { id: '/(auth)/admin/piece/[...path]/published' }
	} as Parameters<typeof load>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	config.url.app = 'https://app.example/garden/'
	getWebPiece.mockResolvedValue({ ...serving })
	getStorage.mockReturnValue({ createReadStream, write, sync })
	query.executeTakeFirst.mockResolvedValue({ content_hash: serving.content_hash })
	query.execute.mockImplementation(() =>
		Promise.resolve(
			db.selectFrom.mock.lastCall?.[0] === 'web_pieces_assets'
				? [
						{
							piece_file_path: file,
							piece_asset_path: '.assets/private-draft.jpg',
							piece_field_path: 'draft.cover',
							asset_key: 'published-cover',
							transformation: 'image.original',
							asset_path: 'public/cover.jpg',
							mime_type: 'image/jpeg'
						}
					]
				: tags
		)
	)
})

test('loads only serving data/public assets, distinct tags and actual public URL without draft or current schema', async () => {
	const data = await load(event())
	expect(data).toMatchObject({
		file,
		piece: {
			title: 'Published title',
			metadata: { title: 'Published metadata' },
			assets: [{ asset_path: 'public/cover.jpg' }]
		},
		tags,
		publication: { lastPublishedAt: 1234, markdownStatus: MarkdownPublicationStatus.MATCHING },
		publishedUrl: 'https://app.example/garden/pieces/removed-schema/public%20%23%3F%25',
		links: {
			source: '/admin/piece/old%20type/%E6%BA%90%20%23%3F%25.books.md/source',
			overview: '/admin/piece/old%20type/%E6%BA%90%20%23%3F%25.books.md/published',
			page: '/admin/piece/old%20type/%E6%BA%90%20%23%3F%25.books.md/published/page',
			icon: '/admin/piece/old%20type/%E6%BA%90%20%23%3F%25.books.md/published/icon',
			share: '/admin/piece/old%20type/%E6%BA%90%20%23%3F%25.books.md/published/share'
		}
	})
	expect(Object.keys(data!).sort()).toEqual([
		'file',
		'links',
		'piece',
		'publication',
		'publishedUrl',
		'tags'
	])
	expect(getWebPiece).toHaveBeenCalledExactlyOnceWith(db, file)
	expect(db.selectFrom.mock.calls).toEqual([
		['web_pieces_assets'],
		['web_pieces_tags'],
		['pieces_cache']
	])
	expect(query.select).toHaveBeenCalledWith(['slug', 'tag'])
	expect(query.distinct).toHaveBeenCalledOnce()
	expect(query.where).toHaveBeenCalledWith('piece_id', '=', serving.id)
	expect(query.where).toHaveBeenCalledWith('file_path', '=', file)
	expect(query.executeTakeFirst).toHaveBeenCalledOnce()
	const json = JSON.stringify(data)
	for (const privateValue of [
		'content_hash',
		serving.content_hash,
		'last_published_at',
		'json_metadata',
		'file_path',
		'piece_asset_path',
		'piece_field_path',
		'private-draft',
		'private-ai',
		'private-auth'
	])
		expect(json).not.toContain(privateValue)
	for (const forbidden of [getPieces, getStorage, createReadStream, write, sync, runWorkflow])
		expect(forbidden).not.toHaveBeenCalled()
})

test('404 before hydration/status queries when no serving row exists', async () => {
	getWebPiece.mockResolvedValue(undefined)
	await expect(load(event())).rejects.toMatchObject({
		status: 404,
		body: { message: 'Piece is not published.' }
	})
	expect(db.selectFrom).not.toHaveBeenCalled()
	expect(getStorage).not.toHaveBeenCalled()
	expect(runWorkflow).not.toHaveBeenCalled()
})

test.each([
	[serving.content_hash, MarkdownPublicationStatus.MATCHING],
	['different-indexed-hash', MarkdownPublicationStatus.CHANGED],
	[null, MarkdownPublicationStatus.UNKNOWN],
	['', MarkdownPublicationStatus.UNKNOWN],
	[undefined, MarkdownPublicationStatus.UNKNOWN]
] as const)(
	'indexed hash %s reports %s without replacing serving content',
	async (hash, status) => {
		query.executeTakeFirst.mockResolvedValue(
			hash === undefined ? undefined : { content_hash: hash }
		)
		expect(await load(event())).toMatchObject({
			piece: { title: serving.title },
			publication: { markdownStatus: status, lastPublishedAt: 1234 }
		})
		expect(query.executeTakeFirst).toHaveBeenCalledOnce()
		expect(getStorage).not.toHaveBeenCalled()
		expect(getPieces).not.toHaveBeenCalled()
		expect(runWorkflow).not.toHaveBeenCalled()
	}
)

test.each([null, undefined, ''])(
	'missing completed hash %s gives Unknown without a cache read',
	async (hash) => {
		getWebPiece.mockResolvedValue({ ...serving, content_hash: hash })
		expect(await load(event())).toMatchObject({
			publication: { markdownStatus: MarkdownPublicationStatus.UNKNOWN }
		})
		expect(query.executeTakeFirst).not.toHaveBeenCalled()
	}
)

test.each([null, undefined])(
	'legacy timestamp %s is not replaced by source dates',
	async (time) => {
		getWebPiece.mockResolvedValue({ ...serving, last_published_at: time })
		expect(await load(event())).toMatchObject({ publication: { lastPublishedAt: null } })
	}
)

test('source and current schema can be unavailable; existing indexed facts still render', async () => {
	getStorage.mockImplementation(() => {
		throw new Error('Source unavailable')
	})
	getPieces.mockImplementation(() => {
		throw new Error('Schema removed')
	})
	expect(await load(event())).toMatchObject({
		piece: { title: serving.title },
		publication: { markdownStatus: MarkdownPublicationStatus.MATCHING }
	})
	expect(getStorage).not.toHaveBeenCalled()
	expect(getPieces).not.toHaveBeenCalled()
})

test.each([
	['https://public.example/prefix/?old=1#old', 'https://public.example/prefix'],
	['/garden/', 'https://admin.example/garden'],
	['', 'https://admin.example']
])(
	'configured app base %s supplies public URL, not the inspector pathname',
	async (base, expected) => {
		config.url.app = base
		expect(await load(event())).toMatchObject({
			publishedUrl: `${expected}/pieces/removed-schema/public%20%23%3F%25`
		})
	}
)

test('public URL encodes both serving type and slug, including literal percent characters', async () => {
	getWebPiece.mockResolvedValue({ ...serving, type: '旧 #?%/type', slug: 'slug%20/"' })
	expect(await load(event())).toMatchObject({
		publishedUrl: 'https://app.example/garden/pieces/%E6%97%A7%20%23%3F%25%2Ftype/slug%2520%2F%22'
	})
})

test.each(['', '/page', '/icon', '/share'])(
	'loader serializes mounted navigation on %s without a Kit request store',
	async (suffix) => {
		const request = {
			...event(),
			url: new URL(
				`https://admin.example/garden/admin/piece/old%20type/%E6%BA%90%20%23%3F%25.books.md/published${suffix}/?x=1`
			),
			route: { id: '/(auth)/admin/piece/[...path]/published' + suffix }
		} as Parameters<typeof load>[0]
		expect(await load(request)).toMatchObject({
			links: {
				source: '/garden/admin/piece/old%20type/%E6%BA%90%20%23%3F%25.books.md/source',
				overview: '/garden/admin/piece/old%20type/%E6%BA%90%20%23%3F%25.books.md/published',
				share: '/garden/admin/piece/old%20type/%E6%BA%90%20%23%3F%25.books.md/published/share'
			}
		})
	}
)

test('cache database failures follow normal loader failure semantics', async () => {
	query.executeTakeFirst.mockRejectedValue(new Error('Database unavailable'))
	await expect(load(event())).rejects.toThrow('Database unavailable')
	expect(runWorkflow).not.toHaveBeenCalled()
})
