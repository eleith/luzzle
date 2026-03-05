import { describe, test, vi, afterEach, expect } from 'vitest'
import backfill, { backfillAssetKeys, backfillSanitizeMetadata, sanitizeMetadata } from './index.js'
import { getDatabaseAndMigrate } from '../../lib/database.js'
import runWebMigrations from '../../database/migrations.js'
import { Config } from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { mockKysely } from 'src/lib/database.mock.js'

vi.mock('../../lib/database.js')
vi.mock('../../database/migrations.js')
vi.mock('@luzzle/web.utils/server', () => ({
	generateAssetKey: vi.fn((path: string) => `key_${path}`),
}))

const mocks = {
	getDatabaseAndMigrate: vi.mocked(getDatabaseAndMigrate),
	runWebMigrations: vi.mocked(runWebMigrations),
	generateAssetKey: vi.mocked(generateAssetKey),
}

afterEach(() => {
	vi.clearAllMocks()
})

const makeConfig = (): Config =>
	({ paths: { database: 'db.sqlite' }, assets: { salt: 'test-salt' } }) as unknown as Config

describe('sanitizeMetadata', () => {
	test('replaces asset paths with keys', () => {
		const pathToKey = new Map([
			['.assets/films/godzilla.films/poster.jpg', 'key_poster'],
		])
		const input = JSON.stringify({ poster: '.assets/films/godzilla.films/poster.jpg', title: 'Godzilla' })
		const result = sanitizeMetadata(input, pathToKey)
		expect(JSON.parse(result)).toEqual({ poster: 'key_poster', title: 'Godzilla' })
	})

	test('returns unchanged when no paths match', () => {
		const pathToKey = new Map([['other.jpg', 'key_other']])
		const input = JSON.stringify({ title: 'Godzilla' })
		expect(sanitizeMetadata(input, pathToKey)).toBe(input)
	})

	test('returns unchanged when pathToKey is empty', () => {
		const input = JSON.stringify({ title: 'Godzilla' })
		expect(sanitizeMetadata(input, new Map())).toBe(input)
	})

	test('replaces nested asset paths', () => {
		const pathToKey = new Map([['poster.jpg', 'key_poster']])
		const input = JSON.stringify({ media: { image: 'poster.jpg' } })
		const result = sanitizeMetadata(input, pathToKey)
		expect(JSON.parse(result)).toEqual({ media: { image: 'key_poster' } })
	})

	test('replaces asset paths in arrays', () => {
		const pathToKey = new Map([['a.jpg', 'key_a'], ['b.jpg', 'key_b']])
		const input = JSON.stringify({ images: ['a.jpg', 'b.jpg'] })
		const result = sanitizeMetadata(input, pathToKey)
		expect(JSON.parse(result)).toEqual({ images: ['key_a', 'key_b'] })
	})
})

describe('backfillAssetKeys', () => {
	test('computes asset_key from piece_asset_path when present', async () => {
		const { db, queries } = mockKysely()
		queries.execute.mockResolvedValueOnce([
			{ piece_file_path: 'book.md', piece_key: 'pk', piece_asset_path: 'poster.jpg', transformation: 'image.original', asset_key: '', asset_path: 'books/key/poster.jpg', mime_type: 'image/jpeg' },
		])

		const count = await backfillAssetKeys(db, makeConfig())

		expect(count).toBe(1)
		expect(mocks.generateAssetKey).toHaveBeenCalledWith('poster.jpg', 'test-salt')
		expect(db.updateTable).toHaveBeenCalledWith('web_pieces_assets')
	})

	test('falls back to piece_file_path when piece_asset_path is null', async () => {
		const { db, queries } = mockKysely()
		queries.execute.mockResolvedValueOnce([
			{ piece_file_path: 'book.md', piece_key: 'pk', piece_asset_path: null, transformation: 'palette', asset_key: '', asset_path: '', mime_type: 'application/json' },
		])

		await backfillAssetKeys(db, makeConfig())

		expect(mocks.generateAssetKey).toHaveBeenCalledWith('book.md', 'test-salt')
	})

	test('skips rows where asset_key is already set (idempotent)', async () => {
		const { db, queries } = mockKysely()
		queries.execute.mockResolvedValueOnce([])

		const count = await backfillAssetKeys(db, makeConfig())

		expect(count).toBe(0)
		expect(mocks.generateAssetKey).not.toHaveBeenCalled()
	})
})

describe('backfillSanitizeMetadata', () => {
	test('replaces asset paths with keys in json_metadata', async () => {
		const { db, queries } = mockKysely()
		mocks.generateAssetKey.mockReturnValue('key_poster')

		// First query: web_pieces
		queries.execute
			.mockResolvedValueOnce([
				{ id: 'p1', file_path: 'book.md', json_metadata: JSON.stringify({ poster: 'poster.jpg' }), key: 'pk', slug: 'book', type: 'books', title: 'Book', date_added: 1000 },
			])
			// Second query: web_pieces_assets
			.mockResolvedValueOnce([
				{ piece_file_path: 'book.md', piece_asset_path: 'poster.jpg', asset_key: 'key_poster', transformation: 'image.original' },
			])

		const count = await backfillSanitizeMetadata(db)

		expect(count).toBe(1)
		expect(db.updateTable).toHaveBeenCalledWith('web_pieces')
	})

	test('leaves metadata unchanged when no asset paths match (idempotent)', async () => {
		const { db, queries } = mockKysely()

		queries.execute
			.mockResolvedValueOnce([
				{ id: 'p1', file_path: 'book.md', json_metadata: JSON.stringify({ title: 'Book' }), key: 'pk', slug: 'book', type: 'books', title: 'Book', date_added: 1000 },
			])
			.mockResolvedValueOnce([
				{ piece_file_path: 'book.md', piece_asset_path: 'poster.jpg', asset_key: 'key_poster', transformation: 'image.original' },
			])

		const count = await backfillSanitizeMetadata(db)

		expect(count).toBe(0)
		expect(db.updateTable).not.toHaveBeenCalledWith('web_pieces')
	})

	test('handles pieces with no assets', async () => {
		const { db, queries } = mockKysely()

		queries.execute
			.mockResolvedValueOnce([
				{ id: 'p1', file_path: 'book.md', json_metadata: JSON.stringify({ title: 'Book' }), key: 'pk', slug: 'book', type: 'books', title: 'Book', date_added: 1000 },
			])
			.mockResolvedValueOnce([])

		const count = await backfillSanitizeMetadata(db)

		expect(count).toBe(0)
	})
})

describe('backfill command', () => {
	test('runs migrations and both backfill operations', async () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		queries.execute.mockResolvedValue([])

		await backfill(makeConfig())

		expect(mocks.runWebMigrations).toHaveBeenCalledWith(db)
		expect(consoleLogSpy).toHaveBeenCalledWith('[backfill] asset_key: 0 rows updated')
		expect(consoleLogSpy).toHaveBeenCalledWith('[backfill] sanitize metadata: 0 pieces updated')
		consoleLogSpy.mockRestore()
	})

	test('throws if web migrations fail', async () => {
		const { db } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: new Error('migration failed') })

		await expect(backfill(makeConfig())).rejects.toThrow('Web migration failed:')
	})
})
