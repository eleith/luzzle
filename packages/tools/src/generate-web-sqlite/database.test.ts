import { describe, test, expect, vi, afterEach } from 'vitest'
import { generateWebSqlite } from './database.js'
import { getDatabaseClient, sql } from '@luzzle/core'
import { ConfigSchema } from '../lib/config/config.schema.js'
import { mockKysely } from './database.mock.js'

vi.mock('@luzzle/core')

const mocks = {
	getDatabaseClient: vi.mocked(getDatabaseClient),
	sql: vi.mocked(sql),
}

describe('generate-web-sqlite', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should generate web sqlite database with no pieces', async () => {
		const { db, queries } = mockKysely()
		mocks.getDatabaseClient.mockReturnValue(db)
		mocks.sql.mockReturnValue({
			execute: vi.fn(() => Promise.resolve({ rows: [] })),
		} as unknown as ReturnType<typeof sql>)
		vi.spyOn(queries, 'execute').mockResolvedValue([])

		const config: ConfigSchema = {
			url: { app: '', app_assets: '', luzzle_assets: '', editor: '' },
			text: { title: '', description: '' },
			paths: { database: '/tmp/test.db' },
			content: { block: { root: '', feed: '' } },
			theme: {
				light: {},
				dark: {},
				globals: {},
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
		}

		await generateWebSqlite(config)

		expect(mocks.getDatabaseClient).toHaveBeenCalledWith('/tmp/test.db')
		expect(db.schema.dropTable).toHaveBeenCalledWith('web_pieces_tags')
		expect(db.schema.dropTable).toHaveBeenCalledWith('web_pieces')
		expect(db.schema.dropTable).toHaveBeenCalledWith('web_pieces_fts5')
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

		const config: ConfigSchema = {
			url: { app: '', app_assets: '', luzzle_assets: '', editor: '' },
			text: { title: '', description: '' },
			paths: { database: '/tmp/test.db' },
			content: { block: { root: '', feed: '' } },
			theme: {
				light: {},
				dark: {},
				globals: {},
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
		}

		await generateWebSqlite(config)

		expect(queries.insertInto).toHaveBeenCalledWith('web_pieces')
		expect(queries.values).toHaveBeenCalledWith([
			expect.objectContaining({
				media: oneBookFrontmatter.cover_image,
				summary: oneBookFrontmatter.book_summary,
				title: oneBookFrontmatter.book_title,
				slug: 'book1',
				date_consumed: oneBookFrontmatter.read_date,
			}),
			expect.objectContaining({
				media: undefined,
				summary: undefined,
				title: oneFilmFrontmatter.film_title,
				slug: 'film1',
				date_consumed: oneFilmFrontmatter.watch_date,
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

		const config: ConfigSchema = {
			url: { app: '', app_assets: '', luzzle_assets: '', editor: '' },
			text: { title: '', description: '' },
			paths: { database: '/tmp/test.db' },
			content: { block: { root: '', feed: '' } },
			theme: {
				light: {},
				dark: {},
				globals: {},
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
		}

		await generateWebSqlite(config)

		expect(queries.insertInto).toHaveBeenCalledWith('web_pieces')
		expect(queries.values).toHaveBeenCalledWith([
			expect.objectContaining({ slug: 'item' }),
			expect.objectContaining({ slug: 'item--1' }),
		])
	})
})
