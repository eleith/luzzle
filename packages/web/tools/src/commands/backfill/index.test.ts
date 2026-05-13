import { describe, test, vi, afterEach, beforeEach, expect } from 'vitest'
import backfill, { backfillAssetKeys, backfillSanitizeMetadata, sanitizeMetadata } from './index.js'
import { getDatabaseAndMigrate } from '../../lib/database.js'
import runWebMigrations from '../../database/migrations.js'
import { Config } from '@luzzle/web.config'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { type LuzzleDatabase } from '@luzzle/core'
import { setupDatabase, teardownDatabase, TestDatabase } from '../../../test/db.js'

vi.mock('../../lib/database.js')
vi.mock('../../database/migrations.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../database/migrations.js')>()
	return { default: vi.fn().mockImplementation(actual.default) }
})
vi.mock('@luzzle/web.utils/server', () => ({
	generateAssetKey: vi.fn((path: string) => `key_${path}`),
}))

const mocks = {
	getDatabaseAndMigrate: vi.mocked(getDatabaseAndMigrate),
	runWebMigrations: vi.mocked(runWebMigrations),
	generateAssetKey: vi.mocked(generateAssetKey),
}

let db: TestDatabase

beforeEach(async () => {
	db = await setupDatabase()
})

afterEach(async () => {
	await teardownDatabase(db)
	vi.clearAllMocks()
})

const makeConfig = (): Config =>
	({ paths: { database: 'db.sqlite' }, assets: { salt: 'test-salt' } }) as unknown as Config

const webPiece = {
	id: '1',
	type: 'books',
	file_path: 'book.md',
	slug: 'my-book',
	key: 'pk',
	title: 'My Book',
	date_added: 100,
	json_metadata: JSON.stringify({ title: 'Book' }),
}

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
		await db.insertInto('web_pieces').values(webPiece).execute()
		await db.insertInto('web_pieces_assets').values({
			piece_file_path: 'book.md',
			piece_key: 'pk',
			piece_asset_path: 'poster.jpg',
			transformation: 'image.original',
			asset_key: '',
			asset_path: 'books/key/poster.jpg',
			mime_type: 'image/jpeg',
		}).execute()

		const count = await backfillAssetKeys(db as unknown as LuzzleDatabase, makeConfig())

		expect(count).toBe(1)
		expect(mocks.generateAssetKey).toHaveBeenCalledWith('poster.jpg', 'test-salt')
		const rows = await db.selectFrom('web_pieces_assets').selectAll().execute()
		expect(rows[0].asset_key).toBe('key_poster.jpg')
	})

	test('falls back to piece_file_path when piece_asset_path is empty', async () => {
		await db.insertInto('web_pieces').values(webPiece).execute()
		await db.insertInto('web_pieces_assets').values({
			piece_file_path: 'book.md',
			piece_key: 'pk',
			piece_asset_path: '',
			transformation: 'palette',
			asset_key: '',
			mime_type: 'application/json',
		}).execute()

		await backfillAssetKeys(db as unknown as LuzzleDatabase, makeConfig())

		expect(mocks.generateAssetKey).toHaveBeenCalledWith('book.md', 'test-salt')
		const rows = await db.selectFrom('web_pieces_assets').selectAll().execute()
		expect(rows[0].asset_key).toBe('key_book.md')
	})

	test('skips rows where asset_key is already set (idempotent)', async () => {
		await db.insertInto('web_pieces').values(webPiece).execute()
		await db.insertInto('web_pieces_assets').values({
			piece_file_path: 'book.md',
			piece_key: 'pk',
			piece_asset_path: 'poster.jpg',
			transformation: 'image.original',
			asset_key: 'already_set',
			asset_path: 'books/key/poster.jpg',
			mime_type: 'image/jpeg',
		}).execute()

		const count = await backfillAssetKeys(db as unknown as LuzzleDatabase, makeConfig())

		expect(count).toBe(0)
		expect(mocks.generateAssetKey).not.toHaveBeenCalled()
	})
})

describe('backfillSanitizeMetadata', () => {
	test('replaces asset paths with keys in json_metadata', async () => {
		await db.insertInto('web_pieces').values({
			...webPiece,
			json_metadata: JSON.stringify({ poster: 'poster.jpg' }),
		}).execute()
		await db.insertInto('web_pieces_assets').values({
			piece_file_path: 'book.md',
			piece_key: 'pk',
			piece_asset_path: 'poster.jpg',
			transformation: 'image.original',
			asset_key: 'key_poster',
			asset_path: 'books/key/poster.jpg',
			mime_type: 'image/jpeg',
		}).execute()

		const count = await backfillSanitizeMetadata(db as unknown as LuzzleDatabase)

		expect(count).toBe(1)
		const pieces = await db.selectFrom('web_pieces').selectAll().execute()
		expect(JSON.parse(pieces[0].json_metadata)).toEqual({ poster: 'key_poster' })
	})

	test('leaves metadata unchanged when no asset paths match (idempotent)', async () => {
		await db.insertInto('web_pieces').values(webPiece).execute()
		await db.insertInto('web_pieces_assets').values({
			piece_file_path: 'book.md',
			piece_key: 'pk',
			piece_asset_path: 'poster.jpg',
			transformation: 'image.original',
			asset_key: 'key_poster',
			asset_path: 'books/key/poster.jpg',
			mime_type: 'image/jpeg',
		}).execute()

		const count = await backfillSanitizeMetadata(db as unknown as LuzzleDatabase)

		expect(count).toBe(0)
	})

	test('handles pieces with no assets', async () => {
		await db.insertInto('web_pieces').values(webPiece).execute()

		const count = await backfillSanitizeMetadata(db as unknown as LuzzleDatabase)

		expect(count).toBe(0)
	})
})

describe('backfill command', () => {
	test('runs migrations and both backfill operations', async () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		mocks.getDatabaseAndMigrate.mockResolvedValue(db as unknown as LuzzleDatabase)

		await backfill(makeConfig())

		expect(mocks.runWebMigrations).toHaveBeenCalledWith(db)
		expect(consoleLogSpy).toHaveBeenCalledWith('[backfill] asset_key: 0 rows updated')
		expect(consoleLogSpy).toHaveBeenCalledWith('[backfill] sanitize metadata: 0 pieces updated')
		consoleLogSpy.mockRestore()
	})

	test('throws if web migrations fail', async () => {
		mocks.getDatabaseAndMigrate.mockResolvedValue(db as unknown as LuzzleDatabase)
		mocks.runWebMigrations.mockResolvedValueOnce({ results: [], error: new Error('migration failed') })

		await expect(backfill(makeConfig())).rejects.toThrow('Web migration failed:')
	})
})
