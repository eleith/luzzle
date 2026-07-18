import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Kysely } from 'kysely'
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

		await assetsGenerateStep.run({ filePaths: ['books/a.md', 'books/b.md'] }, ctx)

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
		await assetsGenerateStep.run({ filePaths: [] }, ctx)
		expect(mocks.runTransformsForPiece).not.toHaveBeenCalled()
		expect(mocks.cleanupAllTransforms).not.toHaveBeenCalled()
	})
})
