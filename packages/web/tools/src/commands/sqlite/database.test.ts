import { describe, test, expect, vi, afterEach } from 'vitest'
import { generateWebSqlite } from './database.js'
import { getDatabaseClient, sql } from '@luzzle/core'
import {
	type Config,
	getAssetPath,
	getImageAssetPath,
	getOpenGraphPath,
} from '@luzzle/web.utils'
import { mockKysely } from './database.mock.js'
import { generateAssetKey } from '@luzzle/web.utils/server'

vi.mock('@luzzle/core')
vi.mock('@luzzle/web.utils')
vi.mock('@luzzle/web.utils/server')

const mocks = {
	getDatabaseClient: vi.mocked(getDatabaseClient),
	sql: vi.mocked(sql),
	generateAssetKey: vi.mocked(generateAssetKey),
	getAssetPath: vi.mocked(getAssetPath),
	getImageAssetPath: vi.mocked(getImageAssetPath),
	getOpenGraphPath: vi.mocked(getOpenGraphPath),
}

describe('generate-web-sqlite', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should generate web sqlite database with no pieces', async () => {
		mocks.generateAssetKey.mockImplementation((path) => `key-${path}`)
		const { db, queries } = mockKysely()
		mocks.getDatabaseClient.mockReturnValue(db)
		mocks.sql.mockReturnValue({
			execute: vi.fn(() => Promise.resolve({ rows: [] })),
		} as unknown as ReturnType<typeof sql>)
		vi.spyOn(queries, 'execute').mockResolvedValue([])

		const config = {
			url: { app: '', app_assets: '', luzzle_assets: '', editor: '' },
			paths: { database: '/tmp/test.db' },
			content: { component: { root: '', feed: '' }, text: { title: '', description: '' } },
			auth: { enabled: false, type: 'oidc', secret: '', oidc: { issuer: '', clientId: '', clientSecret: '' } },
			storage: { type: 'filesystem', config: { root: '' } },
			ai: { provider: 'google', api_key: '' },
			assets: { salt: 'test-salt' },
			theme: {
				globals: {},
				light: {},
				dark: {},
				markdown: { code: { light: 'github-light', dark: 'github-dark' }, sidenote: {} },
			},
			pieces: [
				{
					type: 'books',
					fields: {
						title: 'book_title',
						date_consumed: 'read_date',
						summary: 'book_summary',
						media: 'cover_image',
						tags: 'book_tags',
					},
				},
			],
		} as unknown as Config

		await generateWebSqlite(db, config)

		expect(db.schema.dropTable).toHaveBeenCalledWith('web_pieces_assets')
		expect(db.schema.dropTable).toHaveBeenCalledWith('web_pieces_tags')
		expect(db.schema.dropTable).toHaveBeenCalledWith('web_pieces')
		expect(db.schema.dropTable).toHaveBeenCalledWith('web_pieces_fts5')
		expect(db.schema.createTable).toHaveBeenCalledWith('web_pieces_assets')
		expect(db.schema.createTable).toHaveBeenCalledWith('web_pieces_tags')
		expect(db.schema.createTable).toHaveBeenCalledWith('web_pieces')
		expect(queries.insertInto).not.toHaveBeenCalled()
	})

	test('should populate web_pieces and web_pieces_tags table', async () => {
		const { db, queries } = mockKysely()
		const oneBookFrontmatter = {
			book_title: 'Test Book',
			read_date: '2023-01-01',
			book_tags: 'tag1,tag2',
			book_summary: 'A great book.',
			cover_image: 'http://example.com/cover.jpg',
		}
		const oneFilmFrontmatter = {
			film_title: 'Test Book',
			watch_date: '2023-01-01',
		}
		mocks.getDatabaseClient.mockReturnValue(db)
		mocks.sql
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({
				execute: vi.fn().mockResolvedValueOnce({
					rows: [
						{ slug: 'book-1', id: 'item1', type: 'books', tag: 'tag1' },
						{ slug: 'book-1', id: 'item1', type: 'books', tag: 'tag2' },
					],
				}),
			} as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)

		vi.spyOn(queries, 'execute')
			.mockResolvedValueOnce([
				{
					id: 'item1',
					type: 'books',
					file_path: '/path/to/book1.md',
					frontmatter_json: JSON.stringify(oneBookFrontmatter),
					date_added: 123,
				},
				{
					id: 'film1',
					type: 'films',
					file_path: '/path/to/film1.md',
					frontmatter_json: JSON.stringify(oneFilmFrontmatter),
					date_added: 123,
					date_updated: 124,
				},
			]) // populateWebPieceItems (pieces_items query)
			.mockResolvedValueOnce([]) // populateWebPieceItems (web_pieces insert)
			.mockResolvedValueOnce([]) // populateWebPieceTags (web_pieces_tags insert)
			.mockResolvedValueOnce([]) // populateWebPieceSearch
			.mockResolvedValueOnce([]) // generateWebSqlite (final pieces count)
			.mockResolvedValueOnce([]) // generateWebSqlite (final tags count)
			.mockResolvedValueOnce([]) // generateWebSqlite (final assets count)

		const config = {
			url: { app: '', app_assets: '', luzzle_assets: '', editor: '' },
			paths: { database: '/tmp/test.db' },
			content: { component: { root: '', feed: '' }, text: { title: '', description: '' } },
			auth: { enabled: false, type: 'oidc', secret: '', oidc: { issuer: '', clientId: '', clientSecret: '' } },
			storage: { type: 'filesystem', config: { root: '' } },
			ai: { provider: 'google', api_key: '' },
			assets: { salt: 'test-salt' },
			theme: {
				globals: {},
				light: {},
				dark: {},
				markdown: { code: { light: 'github-light', dark: 'github-dark' }, sidenote: {} },
			},
			pieces: [
				{
					type: 'books',
					fields: {
						title: 'book_title',
						date_consumed: 'read_date',
						summary: 'book_summary',
						media: 'cover_image',
						tags: 'book_tags',
					},
				},
				{
					type: 'films',
					fields: {
						title: 'film_title',
						date_consumed: 'watch_date',
					},
				},
			],
		} as unknown as Config

		await generateWebSqlite(db, config)

		expect(queries.insertInto).toHaveBeenCalledWith('web_pieces')
		expect(queries.values).toHaveBeenCalledWith([
			expect.objectContaining({
				media: oneBookFrontmatter.cover_image,
				summary: oneBookFrontmatter.book_summary,
				title: oneBookFrontmatter.book_title,
				slug: 'book1',
				date_consumed: oneBookFrontmatter.read_date,
				key: expect.any(String),
			}),
			expect.objectContaining({
				media: undefined,
				summary: undefined,
				title: oneFilmFrontmatter.film_title,
				slug: 'film1',
				date_consumed: oneFilmFrontmatter.watch_date,
				key: expect.any(String),
			}),
		])
		expect(queries.insertInto).toHaveBeenCalledWith('web_pieces_tags')
		expect(queries.values).toHaveBeenCalledWith([
			expect.objectContaining({ tag: 'tag1', piece_id: 'item1', piece_type: 'books' }),
			expect.objectContaining({ tag: 'tag2', piece_id: 'item1', piece_type: 'books' }),
		])
	})

	test('should generate unique slugs for duplicate filenames of different types', async () => {
		const { db, queries } = mockKysely()
		mocks.getDatabaseClient.mockReturnValue(db)
		mocks.sql
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({
				execute: vi.fn().mockResolvedValueOnce({
					rows: [],
				}),
			} as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)

		// Mock all execute calls in sequence
		vi.spyOn(queries, 'execute')
			.mockResolvedValueOnce([
				{
					id: 'item1',
					type: 'books',
					file_path: '/path/to/item.md',
					frontmatter_json: '{ "book_title": "Test Book", "read_date": "2023-01-01" }',
					date_added: 123,
				},
				{
					id: 'item2',
					type: 'books',
					file_path: '/another/path/to/item.md',
					frontmatter_json: '{ "movie_title": "Test Book", "read_date": "2023-02-01" }',
					date_added: 124,
				},
			]) // populateWebPieceItems (pieces_items query)
			.mockResolvedValueOnce([]) // populateWebPieceItems (web_pieces insert)
			.mockResolvedValueOnce([]) // populateWebPieceTags (tags query)
			.mockResolvedValueOnce([]) // populateWebPieceTags (web_pieces_tags insert)
			.mockResolvedValueOnce([]) // populateWebPieceSearch
			.mockResolvedValueOnce([]) // generateWebSqlite (final pieces count)
			.mockResolvedValueOnce([]) // generateWebSqlite (final tags count)
			.mockResolvedValueOnce([]) // generateWebSqlite (final assets count)

		const config = {
			url: { app: '', app_assets: '', luzzle_assets: '', editor: '' },
			paths: { database: '/tmp/test.db' },
			content: { component: { root: '', feed: '' }, text: { title: '', description: '' } },
			auth: { enabled: false, type: 'oidc', secret: '', oidc: { issuer: '', clientId: '', clientSecret: '' } },
			storage: { type: 'filesystem', config: { root: '' } },
			ai: { provider: 'google', api_key: '' },
			assets: { salt: 'test-salt' },
			theme: {
				globals: {},
				light: {},
				dark: {},
				markdown: { code: { light: 'github-light', dark: 'github-dark' }, sidenote: {} },
			},
			pieces: [
				{
					type: 'books',
					fields: {
						title: 'book_title',
						date_consumed: 'read_date',
						summary: 'book_summary',
						media: 'cover_image',
						tags: 'book_tags',
					},
				},
			],
		} as unknown as Config

		await generateWebSqlite(db, config)

		expect(queries.insertInto).toHaveBeenCalledWith('web_pieces')
		expect(queries.values).toHaveBeenCalledWith([
			expect.objectContaining({ slug: 'item' }),
			expect.objectContaining({ slug: 'item--1' }),
		])
	})

	test('should populate web_pieces_assets table', async () => {
		const { db, queries } = mockKysely()
		const frontmatter = {
			book_title: 'Test Book',
			read_date: '2023-01-01',
			book_tags: 'tag1',
			cover_image: 'cover.jpg',
			docs: ['doc.pdf', 'file.unknown_ext']
		}
		mocks.getDatabaseClient.mockReturnValue(db)
		mocks.sql
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn().mockResolvedValueOnce({ rows: [] }) } as unknown as ReturnType<typeof sql>)
			.mockReturnValueOnce({ execute: vi.fn() } as unknown as ReturnType<typeof sql>)

		const itemsReturn = [
			{
				id: 'item1',
				type: 'books',
				file_path: '/path/to/book1.md',
				frontmatter_json: JSON.stringify(frontmatter),
				date_added: 123,
			},
			{
				id: 'item2',
				type: 'unknown_type',
				file_path: '/path/to/unknown.md',
				frontmatter_json: '{}',
				date_added: 123,
			},
		]

		vi.spyOn(queries, 'execute')
			.mockResolvedValueOnce(itemsReturn) // populateWebPieceItems (pieces_items query)
			.mockResolvedValueOnce([]) // populateWebPieceItems (web_pieces insert)
			.mockResolvedValueOnce(itemsReturn) // populateWebPiecesAssets (pieces_items query)
			.mockResolvedValueOnce([]) // populateWebPiecesAssets (web_pieces_assets insert)
			.mockResolvedValueOnce([]) // generateWebSqlite (final pieces count)
			.mockResolvedValueOnce([]) // generateWebSqlite (final tags count)
			.mockResolvedValueOnce([]) // generateWebSqlite (final assets count)

		const config = {
			url: { app: '', app_assets: '', luzzle_assets: '', editor: '' },
			paths: { database: '/tmp/test.db' },
			assets: { salt: 'test-salt' },
			pieces: [
				{
					type: 'books',
					fields: {
						title: 'book_title',
						media: 'cover_image',
						assets: ['docs']
					},
				},
			],
		} as unknown as Config

		mocks.generateAssetKey.mockImplementation((path) => `key-${path}`)
		mocks.getAssetPath.mockImplementation((type, id, asset) => `${type}/${id}/${asset.split('/').pop()}`)
		mocks.getImageAssetPath.mockImplementation((type, id, asset, width, format) => `${type}/${id}/${asset.split('/').pop()}.${width}.${format}`)
		mocks.getOpenGraphPath.mockImplementation((type, id) => `${type}/${id}/opengraph.png`)

		await generateWebSqlite(db, config)

		expect(queries.insertInto).toHaveBeenCalledWith('web_pieces_assets')
				expect(queries.values).toHaveBeenCalledWith([
					expect.objectContaining({ transformation: 'opengraph' }),
					expect.objectContaining({ piece_asset_path: 'cover.jpg', transformation: 'original' }),
					expect.objectContaining({ piece_asset_path: 'cover.jpg', transformation: 'image.s.avif' }),
					expect.objectContaining({ piece_asset_path: 'cover.jpg', transformation: 'image.m.avif' }),
					expect.objectContaining({ piece_asset_path: 'cover.jpg', transformation: 'image.l.avif' }),
					expect.objectContaining({ piece_asset_path: 'cover.jpg', transformation: 'image.xl.avif' }),
					expect.objectContaining({ piece_asset_path: 'cover.jpg', transformation: 'image.s.jpg' }),
					expect.objectContaining({ piece_asset_path: 'cover.jpg', transformation: 'image.m.jpg' }),
					expect.objectContaining({ piece_asset_path: 'cover.jpg', transformation: 'image.l.jpg' }),
					expect.objectContaining({ piece_asset_path: 'cover.jpg', transformation: 'image.xl.jpg' }),
					expect.objectContaining({ piece_asset_path: 'doc.pdf', transformation: 'original' }),
					expect.objectContaining({ piece_asset_path: 'file.unknown_ext', transformation: 'original' }),
					expect.objectContaining({ transformation: 'opengraph' }),
				])
			})
		})
