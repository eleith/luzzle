import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import type * as luzzleCore from '@luzzle/core'
import type { LuzzleTables } from '@luzzle/core'
import { Pieces, StorageFileSystem } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { WebDatabase } from '../services/db.js'
import type { WorkerContext } from '../services/context.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { runTransformsForPiece } from '../transforms/runner.js'
import { cleanupAllTransforms } from '../transforms/index.js'
import { buildAssetMaps } from '../transforms/utils/assets.js'
import { assetsGenerateStep } from './assets-generate.js'

vi.mock('@luzzle/core', async (importOriginal) => {
	const actual = await importOriginal<typeof luzzleCore>()
	return {
		...actual,
		Pieces: vi.fn(),
		StorageFileSystem: vi.fn(),
	}
})
vi.mock('../transforms/runner.js')
vi.mock('../transforms/index.js')
vi.mock('../transforms/utils/assets.js')

const mocks = {
	runTransformsForPiece: vi.mocked(runTransformsForPiece),
	cleanupAllTransforms: vi.mocked(cleanupAllTransforms),
	buildAssetMaps: vi.mocked(buildAssetMaps),
	Pieces: vi.mocked(Pieces),
	StorageFileSystem: vi.mocked(StorageFileSystem),
}

type FullDb = Kysely<WebDatabase & LuzzleTables>

function makeConfig(): Config {
	return {
		storage: { root: '/app/archive' },
		paths: { database: 'db.sqlite', assets: '/app/assets/pieces', config: '/app/config.yaml' },
		assets: { salt: 'salt' },
		pieces: [],
	} as unknown as Config
}

let db: FullDb
let ctx: WorkerContext

beforeEach(async () => {
	db = (await setupDatabase()).withTables<LuzzleTables>() as FullDb
	ctx = {
		config: makeConfig(),
		logger: {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			stdout: vi.fn(),
			stderr: vi.fn(),
		},
		rclone: {} as WorkerContext['rclone'],
		db: db as unknown as WorkerContext['db'],
	}
	mocks.runTransformsForPiece.mockResolvedValue(undefined)
	mocks.cleanupAllTransforms.mockResolvedValue(undefined)
	mocks.buildAssetMaps.mockReturnValue({ pathToKey: new Map(), keyToPath: new Map() })
	mocks.Pieces.mockReturnValue({} as unknown as Pieces)
	mocks.StorageFileSystem.mockReturnValue({} as unknown as StorageFileSystem)
})

afterEach(async () => {
	await teardownDatabase(db)
	vi.clearAllMocks()
})

async function seedPiece(over: Partial<Record<string, unknown>> = {}) {
	const row = {
		id: 'item-1',
		key: 'k1',
		title: 'T',
		slug: 'great',
		file_path: 'books/great.md',
		date_added: 1,
		type: 'books',
		json_metadata: '{}',
		...over,
	}
	await db.insertInto('web_pieces').values(row).execute()
	return row
}

async function seedItem(over: Partial<Record<string, unknown>> = {}) {
	const row = {
		id: 'item-1',
		file_path: 'books/great.md',
		type: 'books',
		date_added: 1,
		note_markdown: '',
		frontmatter_json: '{}',
		assets_json_array: JSON.stringify(['books/great/cover.png']),
		...over,
	}
	await (db.insertInto('pieces_items') as unknown as {
		values: (v: typeof row) => { execute: () => Promise<void> }
	})
		.values(row)
		.execute()
	return row
}

describe('assetsGenerateStep', () => {
	test('runs transforms for each filePath given', async () => {
		await seedPiece({ id: 'a', file_path: 'books/a.md' })
		await seedPiece({ id: 'b', file_path: 'books/b.md' })

		const result = await assetsGenerateStep.run({ filePaths: ['books/a.md', 'books/b.md'] }, ctx)

		expect(result).toEqual({ status: 'completed', value: { failedPieces: [] } })
		expect(ctx.logger.warn).not.toHaveBeenCalled()
		expect(mocks.runTransformsForPiece).toHaveBeenCalledTimes(2)
		const paths = mocks.runTransformsForPiece.mock.calls.map((c) => c[1].file_path).sort()
		expect(paths).toEqual(['books/a.md', 'books/b.md'])
	})

	test('skips web_pieces rows not in filePaths', async () => {
		await seedPiece({ id: 'a', file_path: 'books/a.md' })
		await seedPiece({ id: 'b', file_path: 'books/b.md' })

		await assetsGenerateStep.run({ filePaths: ['books/a.md'] }, ctx)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledTimes(1)
		expect(mocks.runTransformsForPiece.mock.calls[0][1].file_path).toBe('books/a.md')
	})

	test('passes config.paths.assets as outDir', async () => {
		await seedPiece()
		await assetsGenerateStep.run({ filePaths: ['books/great.md'] }, ctx)
		expect(mocks.runTransformsForPiece.mock.calls[0][3]).toBe('/app/assets/pieces')
	})

	test('builds keyToPath from pieces_items.assets_json_array', async () => {
		await seedPiece()
		await seedItem()

		await assetsGenerateStep.run({ filePaths: ['books/great.md'] }, ctx)

		expect(mocks.buildAssetMaps).toHaveBeenCalledWith(
			JSON.stringify(['books/great/cover.png']),
			'salt'
		)
	})

	test('passes empty asset map when pieces_items row is missing', async () => {
		await seedPiece()
		await assetsGenerateStep.run({ filePaths: ['books/great.md'] }, ctx)
		expect(mocks.buildAssetMaps).toHaveBeenCalledWith(undefined, 'salt')
	})

	test('calls cleanupAllTransforms after iteration', async () => {
		await seedPiece()
		await assetsGenerateStep.run({ filePaths: ['books/great.md'] }, ctx)
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
	})

	test('logs start and complete', async () => {
		await assetsGenerateStep.run({ filePaths: ['books/great.md'] }, ctx)
		expect(ctx.logger.info).toHaveBeenCalledWith('assets.generate starting', { count: 1 })
		expect(ctx.logger.info).toHaveBeenCalledWith('assets.generate complete')
	})

	test('short-circuits and skips cleanup when filePaths is empty', async () => {
		await seedPiece()
		const result = await assetsGenerateStep.run({ filePaths: [] }, ctx)
		expect(result).toEqual({ status: 'completed', value: { failedPieces: [] } })
		expect(mocks.runTransformsForPiece).not.toHaveBeenCalled()
		expect(mocks.cleanupAllTransforms).not.toHaveBeenCalled()
	})

	test('continues after the first piece rejects', async () => {
		await seedPiece({ id: 'a', file_path: 'books/a.md' })
		await seedPiece({ id: 'b', file_path: 'books/b.md' })
		mocks.runTransformsForPiece.mockRejectedValueOnce(new Error('piece processing failed'))

		const result = await assetsGenerateStep.run({ filePaths: ['books/a.md', 'books/b.md'] }, ctx)

		expect(mocks.runTransformsForPiece.mock.calls.map((call) => call[1].file_path)).toEqual([
			'books/a.md',
			'books/b.md',
		])
		expect(result).toEqual({
			status: 'completed',
			value: { failedPieces: [{ filePath: 'books/a.md', message: 'piece processing failed' }] },
		})
		expect(ctx.logger.error).toHaveBeenCalledWith('assets.generate failed for books/a.md', {
			message: 'piece processing failed',
		})
		expect(ctx.logger.warn).toHaveBeenCalledWith('assets.generate complete with failures', {
			failedCount: 1,
			count: 2,
		})
		expect(ctx.logger.info).not.toHaveBeenCalledWith('assets.generate complete')
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
		expect(mocks.cleanupAllTransforms.mock.invocationCallOrder[0]).toBeGreaterThan(
			mocks.runTransformsForPiece.mock.invocationCallOrder[1]
		)
	})

	test('continues after per-piece asset preparation fails', async () => {
		await seedPiece({ id: 'a', file_path: 'books/a.md' })
		await seedPiece({ id: 'b', file_path: 'books/b.md' })
		mocks.buildAssetMaps.mockImplementationOnce(() => {
			throw new Error('asset map failed')
		})

		const result = await assetsGenerateStep.run({ filePaths: ['books/a.md', 'books/b.md'] }, ctx)

		expect(result).toEqual({
			status: 'completed',
			value: { failedPieces: [{ filePath: 'books/a.md', message: 'asset map failed' }] },
		})
		expect(mocks.buildAssetMaps).toHaveBeenCalledTimes(2)
		expect(mocks.runTransformsForPiece).toHaveBeenCalledOnce()
		expect(mocks.runTransformsForPiece.mock.calls[0][1].file_path).toBe('books/b.md')
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
	})

	test.each([
		{ thrown: 'string failure', message: 'string failure' },
		{ thrown: null, message: 'null' },
		{ thrown: undefined, message: 'undefined' },
		{ thrown: { reason: 'failure' }, message: '[object Object]' },
	])('normalizes non-Error rejection $message', async ({ thrown, message }) => {
		await seedPiece()
		mocks.runTransformsForPiece.mockRejectedValueOnce(thrown)

		const result = await assetsGenerateStep.run({ filePaths: ['books/great.md'] }, ctx)

		expect(result).toEqual({
			status: 'completed',
			value: { failedPieces: [{ filePath: 'books/great.md', message }] },
		})
		expect(JSON.parse(JSON.stringify(result))).toEqual(result)
		expect(ctx.logger.error).toHaveBeenCalledWith('assets.generate failed for books/great.md', {
			message,
		})
		expect(ctx.logger.warn).toHaveBeenCalledWith('assets.generate complete with failures', {
			failedCount: 1,
			count: 1,
		})
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
	})

	test('collects every failed piece', async () => {
		await seedPiece({ id: 'a', file_path: 'books/a.md' })
		await seedPiece({ id: 'b', file_path: 'books/b.md' })
		mocks.runTransformsForPiece
			.mockRejectedValueOnce(new Error('first failure'))
			.mockRejectedValueOnce(new Error('second failure'))

		const result = await assetsGenerateStep.run({ filePaths: ['books/a.md', 'books/b.md'] }, ctx)

		expect(result).toEqual({
			status: 'completed',
			value: {
				failedPieces: [
					{ filePath: 'books/a.md', message: 'first failure' },
					{ filePath: 'books/b.md', message: 'second failure' },
				],
			},
		})
		expect(ctx.logger.warn).toHaveBeenCalledWith('assets.generate complete with failures', {
			failedCount: 2,
			count: 2,
		})
	})

	test('propagates global selection failures and still cleans up', async () => {
		await sql`DROP TABLE web_pieces`.execute(db)

		await expect(
			assetsGenerateStep.run({ filePaths: ['books/great.md'] }, ctx)
		).rejects.toThrow('no such table: web_pieces')

		expect(mocks.runTransformsForPiece).not.toHaveBeenCalled()
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
		expect(ctx.logger.warn).not.toHaveBeenCalled()
		expect(ctx.logger.info).not.toHaveBeenCalledWith('assets.generate complete')
	})

	test.each([false, true])('propagates cleanup failures (piece failed: %s)', async (pieceFailed) => {
		await seedPiece()
		if (pieceFailed) mocks.runTransformsForPiece.mockRejectedValueOnce(new Error('piece failed'))
		const error = new Error('cleanup failed')
		mocks.cleanupAllTransforms.mockRejectedValueOnce(error)

		await expect(
			assetsGenerateStep.run({ filePaths: ['books/great.md'] }, ctx)
		).rejects.toBe(error)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledOnce()
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
		expect(ctx.logger.warn).not.toHaveBeenCalled()
		expect(ctx.logger.info).not.toHaveBeenCalledWith('assets.generate complete')
	})
})
