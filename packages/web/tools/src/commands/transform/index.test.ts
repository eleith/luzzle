import { describe, test, expect, vi, afterEach, MockInstance } from 'vitest'
import runTransform from './index.js'
import { Pieces } from '@luzzle/core'
import { getStorage } from '../../lib/storage.js'
import { getDatabaseAndMigrate } from '../../lib/database.js'
import runWebMigrations from '../../database/migrations.js'
import { type Config } from '@luzzle/web.utils'
import { mockKysely } from '../../lib/database.mock.js'
import { transforms } from '../../lib/transforms/index.js'

vi.mock('@luzzle/core')
vi.mock('../../lib/storage.js')
vi.mock('../../lib/database.js')
vi.mock('../../database/migrations.js')
vi.mock('../../lib/transforms/index.js')

const mocks = {
	Pieces: vi.mocked(Pieces),
	getStorage: vi.mocked(getStorage),
	getDatabaseAndMigrate: vi.mocked(getDatabaseAndMigrate),
	runWebMigrations: vi.mocked(runWebMigrations),
}

const spies: { [key: string]: MockInstance } = {};

const config = {
	paths: { database: 'db.sqlite' },
	assets: { salt: 'test-salt' },
} as unknown as Config

const pieceItem = {
	id: '1',
	type: 'books',
	file_path: 'book.md',
	frontmatter_json: '{}',
	note_markdown: '',
	date_added: 100,
}

afterEach(() => {
	vi.clearAllMocks()
})

describe('commands/transform/index', () => {
	test('runs the specified transform for the given piece', async () => {
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)

		spies.queries = vi.spyOn(queries, 'executeTakeFirst').mockResolvedValue(pieceItem)
		spies.openGraphRun = vi.spyOn(transforms.opengraph, 'run').mockResolvedValue()
		spies.openGraphCleanup = (vi.spyOn(transforms.opengraph, 'cleanup') as MockInstance<() => Promise<void>>).mockResolvedValue()

		await runTransform({ outDir: '/out', type: 'opengraph', file: 'book.md' }, config)

		expect(spies.openGraphRun).toHaveBeenCalledWith(
			expect.objectContaining({ item: pieceItem, outDir: '/out' })
		)
		expect(spies.openGraphCleanup).toHaveBeenCalledOnce()
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

	test('throws if piece not found', async () => {
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)
		vi.spyOn(queries, 'executeTakeFirst').mockResolvedValue(undefined)

		await expect(
			runTransform({ outDir: '/out', type: 'attachment', file: 'missing.md' }, config)
		).rejects.toThrow('Piece not found')
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
