import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Kysely } from 'kysely'
import type { LuzzleTables, Pieces } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { Logger } from '../logger.js'
import type { WebDatabase } from '../db.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { runTransformsForPiece } from '../transforms/runner.js'
import { cleanupAllTransforms } from '../transforms/index.js'
import { buildAssetMaps } from '../transforms/utils/assets.js'
import { runAssetsGenerate } from './assets-generate.js'

vi.mock('../transforms/runner.js')
vi.mock('../transforms/index.js')
vi.mock('../transforms/utils/assets.js')

const mocks = {
	runTransformsForPiece: vi.mocked(runTransformsForPiece),
	cleanupAllTransforms: vi.mocked(cleanupAllTransforms),
	buildAssetMaps: vi.mocked(buildAssetMaps),
}

type FullDb = Kysely<WebDatabase & LuzzleTables>

function makeLogger(): Logger {
	return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

function makeConfig(): Config {
	return {
		storage: { root: '/app/archive' },
		paths: { database: 'db.sqlite', assets: '/app/assets/pieces', config: '/app/config.yaml' },
		assets: { salt: 'salt' },
		pieces: [],
	} as unknown as Config
}

let db: FullDb
let logger: Logger
let pieces: Pieces

beforeEach(async () => {
	db = (await setupDatabase()).withTables<LuzzleTables>() as FullDb
	logger = makeLogger()
	pieces = {} as Pieces
	mocks.runTransformsForPiece.mockResolvedValue(undefined)
	mocks.cleanupAllTransforms.mockResolvedValue(undefined)
	mocks.buildAssetMaps.mockReturnValue({ pathToKey: new Map(), keyToPath: new Map() })
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

describe('lib/assets-generate', () => {
	test('runs transforms for every web_pieces row', async () => {
		await seedPiece({ id: 'a', file_path: 'books/a.md' })
		await seedPiece({ id: 'b', file_path: 'books/b.md' })

		await runAssetsGenerate(db, pieces, makeConfig(), logger)

		expect(mocks.runTransformsForPiece).toHaveBeenCalledTimes(2)
		const paths = mocks.runTransformsForPiece.mock.calls.map((c) => c[1].file_path).sort()
		expect(paths).toEqual(['books/a.md', 'books/b.md'])
	})

	test('passes config.paths.assets as outDir', async () => {
		await seedPiece()

		await runAssetsGenerate(db, pieces, makeConfig(), logger)

		expect(mocks.runTransformsForPiece.mock.calls[0][3]).toBe('/app/assets/pieces')
	})

	test('builds keyToPath from pieces_items.assets_json_array', async () => {
		await seedPiece()
		await seedItem()

		await runAssetsGenerate(db, pieces, makeConfig(), logger)

		expect(mocks.buildAssetMaps).toHaveBeenCalledWith(
			JSON.stringify(['books/great/cover.png']),
			'salt'
		)
	})

	test('passes empty asset map when pieces_items row is missing', async () => {
		await seedPiece()

		await runAssetsGenerate(db, pieces, makeConfig(), logger)

		expect(mocks.buildAssetMaps).toHaveBeenCalledWith(undefined, 'salt')
	})

	test('calls cleanupAllTransforms after iteration', async () => {
		await seedPiece()

		await runAssetsGenerate(db, pieces, makeConfig(), logger)

		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
		const cleanupOrder = mocks.cleanupAllTransforms.mock.invocationCallOrder[0]
		const transformOrder = mocks.runTransformsForPiece.mock.invocationCallOrder[0]
		expect(cleanupOrder).toBeGreaterThan(transformOrder)
	})

	test('logs start and complete', async () => {
		await runAssetsGenerate(db, pieces, makeConfig(), logger)
		expect(logger.info).toHaveBeenCalledWith('assets.generate starting')
		expect(logger.info).toHaveBeenCalledWith('assets.generate complete')
	})

	test('logs per-piece progress', async () => {
		await seedPiece()
		await runAssetsGenerate(db, pieces, makeConfig(), logger)
		expect(logger.info).toHaveBeenCalledWith(
			'assets.generate running transforms: books/great.md'
		)
	})

	test('no-op when web_pieces is empty', async () => {
		await runAssetsGenerate(db, pieces, makeConfig(), logger)
		expect(mocks.runTransformsForPiece).not.toHaveBeenCalled()
		expect(mocks.cleanupAllTransforms).toHaveBeenCalledOnce()
	})
})
