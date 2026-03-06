import { describe, test, expect, vi, afterEach } from 'vitest'
import runTransform from './index.js'
import { Pieces } from '@luzzle/core'
import { getStorage } from '../../lib/storage.js'
import { getDatabaseAndMigrate } from '../../lib/database.js'
import runWebMigrations from '../../database/migrations.js'
import { cleanupAllTransforms } from '../../lib/transforms/index.js'
import { runTransformsForPiece } from '../../lib/transforms/runner.js'
import type { Config } from '@luzzle/web.utils'
import { mockKysely } from '../../lib/database.mock.js'

vi.mock('@luzzle/core')
vi.mock('../../lib/storage.js')
vi.mock('../../lib/database.js')
vi.mock('../../database/migrations.js')
vi.mock('../../lib/transforms/index.js', () => ({
	transforms: new Map([
		['attachment', { run: vi.fn().mockResolvedValue([]), cleanup: undefined }],
		['image', { run: vi.fn().mockResolvedValue([]), cleanup: undefined }],
		['opengraph', { run: vi.fn().mockResolvedValue([]), cleanup: vi.fn().mockResolvedValue(undefined) }],
	]),
	cleanupAllTransforms: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../lib/transforms/runner.js', () => ({
	runTransformsForPiece: vi.fn().mockResolvedValue(undefined),
}))

const mocks = {
	Pieces: vi.mocked(Pieces),
	getStorage: vi.mocked(getStorage),
	getDatabaseAndMigrate: vi.mocked(getDatabaseAndMigrate),
	runWebMigrations: vi.mocked(runWebMigrations),
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
}

afterEach(() => {
	vi.clearAllMocks()
})

describe('commands/transform/index', () => {
	test('runs transform for single piece when --file is given', async () => {
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)
		vi.spyOn(queries, 'executeTakeFirst').mockResolvedValue(webPiece)

		await runTransform({ outDir: '/out', type: 'attachment', file: 'book.md' }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db,
			webPiece,
			config,
			'/out',
			expect.anything(),
			{ typeFilter: 'attachment', dryRun: undefined },
			expect.any(Map)
		)
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
	})

	test('runs with dry-run when --file is given', async () => {
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)
		vi.spyOn(queries, 'executeTakeFirst').mockResolvedValue(webPiece)

		await runTransform({ outDir: '/out', type: 'attachment', file: 'book.md', dryRun: true }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db,
			webPiece,
			config,
			'/out',
			expect.anything(),
			{ typeFilter: 'attachment', dryRun: true },
			expect.any(Map)
		)
	})

	test('runs all transforms for single piece when no --type given', async () => {
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)
		vi.spyOn(queries, 'executeTakeFirst').mockResolvedValue(webPiece)

		await runTransform({ outDir: '/out', file: 'book.md' }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db,
			webPiece,
			config,
			'/out',
			expect.anything(),
			{ typeFilter: undefined, dryRun: undefined },
			expect.any(Map)
		)
	})

	test('runs transform for all pieces when no --file given', async () => {
		const piece1 = { ...webPiece, file_path: 'book1.md' }
		const piece2 = { ...webPiece, file_path: 'book2.md', id: '2' }
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)
		vi.spyOn(queries, 'execute').mockResolvedValue([piece1, piece2])

		await runTransform({ outDir: '/out', type: 'attachment' }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledTimes(2)
		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db, piece1, config, '/out', expect.anything(), { typeFilter: 'attachment', dryRun: undefined },
			expect.any(Map)
		)
		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db, piece2, config, '/out', expect.anything(), { typeFilter: 'attachment', dryRun: undefined },
			expect.any(Map)
		)
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
	})

	test('runs all transforms for all pieces when neither --file nor --type given', async () => {
		const piece1 = { ...webPiece, file_path: 'book1.md' }
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)
		vi.spyOn(queries, 'execute').mockResolvedValue([piece1])

		await runTransform({ outDir: '/out' }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db, piece1, config, '/out', expect.anything(), { typeFilter: undefined, dryRun: undefined },
			expect.any(Map)
		)
	})

	test('runs with dry-run for all pieces', async () => {
		const piece1 = { ...webPiece }
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)
		vi.spyOn(queries, 'execute').mockResolvedValue([piece1])

		await runTransform({ outDir: '/out', type: 'attachment', dryRun: true }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db, piece1, config, '/out', expect.anything(), { typeFilter: 'attachment', dryRun: true },
			expect.any(Map)
		)
	})

	test('uses empty map when web piece has no matching pieces_items row', async () => {
		const piece1 = { ...webPiece, file_path: 'book1.md' }
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)
		vi.spyOn(queries, 'execute')
			.mockResolvedValueOnce([piece1])
			.mockResolvedValueOnce([])

		await runTransform({ outDir: '/out', type: 'attachment' }, config)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledWith(
			db, piece1, config, '/out', expect.anything(), { typeFilter: 'attachment', dryRun: undefined },
			expect.any(Map)
		)
		const passedMap = mocks.runTransformsForPiece.mock.calls[0][6] as Map<string, string>
		expect(passedMap.size).toBe(0)
	})

	test('no pieces found runs no transforms but still calls cleanup', async () => {
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)
		vi.spyOn(queries, 'execute').mockResolvedValue([])

		await runTransform({ outDir: '/out', type: 'attachment' }, config)

		expect(mocks.runTransformsForPiece).not.toHaveBeenCalled()
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
	})

	test('throws on unknown transform type', async () => {
		const { db } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)

		await expect(
			runTransform({ outDir: '/out', type: 'unknown', file: 'book.md' }, config)
		).rejects.toThrow('Unknown transform type')
	})

	test('throws if web piece not found when --file is given', async () => {
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)
		vi.spyOn(queries, 'executeTakeFirst').mockResolvedValue(undefined)

		await expect(
			runTransform({ outDir: '/out', type: 'attachment', file: 'missing.md' }, config)
		).rejects.toThrow('Web piece not found')
	})

	test('throws if web migrations fail', async () => {
		const { db } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: new Error('migration error') })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)

		await expect(
			runTransform({ outDir: '/out', type: 'attachment', file: 'book.md' }, config)
		).rejects.toThrow('Web migration failed')
	})
})
