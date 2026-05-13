import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import runTransform from './index.js'
import { getStorage } from '../../lib/storage.js'
import { getDatabaseAndMigrate } from '../../lib/database.js'
import * as webMigrations from '../../database/migrations.js'
import { getTransforms, cleanupAllTransforms } from '../../lib/transforms/index.js'
import { runTransformsForPiece } from '../../lib/transforms/runner.js'
import type { Config, WebPieces } from '@luzzle/web.config'
import { type LuzzleDatabase } from '@luzzle/core'
import { setupDatabase, teardownDatabase, TestDatabase } from '../../../test/db.js'

vi.mock('../../lib/storage.js')
vi.mock('../../lib/database.js')
vi.mock('../../lib/transforms/index.js')
vi.mock('../../lib/transforms/runner.js')

const mocks = {
	getStorage: vi.mocked(getStorage),
	getDatabaseAndMigrate: vi.mocked(getDatabaseAndMigrate),
	getTransforms: vi.mocked(getTransforms),
	cleanupAllTransforms: vi.mocked(cleanupAllTransforms),
	runTransformsForPiece: vi.mocked(runTransformsForPiece),
}

const config = {
	paths: { database: 'db.sqlite' },
	assets: { salt: 'test-salt' },
} as unknown as Config

const webPiece = {
	id: '1',
	type: 'books',
	file_path: 'book.md',
	slug: 'my-book',
	key: 'key123',
	title: 'My Book',
	date_added: 100,
	json_metadata: '{}',
}

let db: TestDatabase

beforeEach(async () => {
	db = await setupDatabase()
	mocks.getDatabaseAndMigrate.mockResolvedValue(db as unknown as LuzzleDatabase)
	mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
	mocks.getTransforms.mockReturnValue(
		new Map([
			['attachment', { run: vi.fn(), cleanup: undefined }],
			['image', { run: vi.fn(), cleanup: undefined }],
			['opengraph', { run: vi.fn(), cleanup: vi.fn() }],
		])
	)
})

afterEach(async () => {
	await teardownDatabase(db)
	vi.clearAllMocks()
})

describe('commands/transform/index', () => {
	test('runs transform for single piece when --file is given', async () => {
		await db.insertInto('web_pieces').values(webPiece).execute()
		await db.insertInto('pieces_items').values({
			id: 'pi1',
			file_path: 'book.md',
			type: 'books',
			note_markdown: '',
			frontmatter_json: '{}',
			assets_json_array: JSON.stringify(['poster.jpg']),
		}).execute()

		await runTransform({ outDir: '/out', type: 'attachment', file: 'book.md' }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db,
			expect.objectContaining(webPiece),
			config,
			'/out',
			expect.anything(),
			{ typeFilter: 'attachment', dryRun: undefined },
			expect.any(Map)
		)
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
	})

	test('runs with dry-run when --file is given', async () => {
		await db.insertInto('web_pieces').values(webPiece).execute()

		await runTransform({ outDir: '/out', type: 'attachment', file: 'book.md', dryRun: true }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db,
			expect.objectContaining(webPiece),
			config,
			'/out',
			expect.anything(),
			{ typeFilter: 'attachment', dryRun: true },
			expect.any(Map)
		)
	})

	test('runs all transforms for single piece when no --type given', async () => {
		await db.insertInto('web_pieces').values(webPiece).execute()

		await runTransform({ outDir: '/out', file: 'book.md' }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db,
			expect.objectContaining(webPiece),
			config,
			'/out',
			expect.anything(),
			{ typeFilter: undefined, dryRun: undefined },
			expect.any(Map)
		)
	})

	test('runs transform for all pieces when no --file given', async () => {
		const piece1 = { ...webPiece, file_path: 'book1.md' }
		const piece2 = { ...webPiece, file_path: 'book2.md', id: '2', slug: 'my-book-2' }
		await db.insertInto('web_pieces').values([piece1, piece2]).execute()
		await db.insertInto('pieces_items').values({
			id: 'pi1',
			file_path: 'book1.md',
			type: 'books',
			note_markdown: '',
			frontmatter_json: '{}',
			assets_json_array: JSON.stringify(['poster.jpg']),
		}).execute()

		await runTransform({ outDir: '/out', type: 'attachment' }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledTimes(2)
		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db, expect.objectContaining(piece1), config, '/out', expect.anything(), { typeFilter: 'attachment', dryRun: undefined },
			expect.any(Map)
		)
		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db, expect.objectContaining(piece2), config, '/out', expect.anything(), { typeFilter: 'attachment', dryRun: undefined },
			expect.any(Map)
		)
		const piece1Map = mocks.runTransformsForPiece.mock.calls.find(
			c => (c[1] as WebPieces).file_path === 'book1.md'
		)![6] as Map<string, string>
		expect(piece1Map.size).toBe(1)
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
	})

	test('runs all transforms for all pieces when neither --file nor --type given', async () => {
		const piece1 = { ...webPiece, file_path: 'book1.md' }
		await db.insertInto('web_pieces').values(piece1).execute()

		await runTransform({ outDir: '/out' }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db, expect.objectContaining(piece1), config, '/out', expect.anything(), { typeFilter: undefined, dryRun: undefined },
			expect.any(Map)
		)
	})

	test('runs with dry-run for all pieces', async () => {
		await db.insertInto('web_pieces').values(webPiece).execute()

		await runTransform({ outDir: '/out', type: 'attachment', dryRun: true }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db, expect.objectContaining(webPiece), config, '/out', expect.anything(), { typeFilter: 'attachment', dryRun: true },
			expect.any(Map)
		)
	})

	test('uses empty map when web piece has no matching pieces_items row', async () => {
		const piece1 = { ...webPiece, file_path: 'book1.md' }
		await db.insertInto('web_pieces').values(piece1).execute()

		await runTransform({ outDir: '/out', type: 'attachment' }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db, expect.objectContaining(piece1), config, '/out', expect.anything(), { typeFilter: 'attachment', dryRun: undefined },
			expect.any(Map)
		)
		const passedMap = mocks.runTransformsForPiece.mock.calls[0][6] as Map<string, string>
		expect(passedMap.size).toBe(0)
	})

	test('no pieces found runs no transforms but still calls cleanup', async () => {
		await runTransform({ outDir: '/out', type: 'attachment' }, config)

		expect(mocks.runTransformsForPiece).not.toHaveBeenCalled()
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
	})

	test('throws on unknown transform type', async () => {
		await expect(
			runTransform({ outDir: '/out', type: 'unknown', file: 'book.md' }, config)
		).rejects.toThrow('Unknown transform type')
	})

	test('throws if web piece not found when --file is given', async () => {
		await expect(
			runTransform({ outDir: '/out', type: 'attachment', file: 'missing.md' }, config)
		).rejects.toThrow('Web piece not found')
	})

	test('throws if web migrations fail', async () => {
		vi.spyOn(webMigrations, 'default').mockResolvedValueOnce({ results: [], error: new Error('migration error') })

		await expect(
			runTransform({ outDir: '/out', type: 'attachment', file: 'book.md' }, config)
		).rejects.toThrow('Web migration failed')
	})
})
