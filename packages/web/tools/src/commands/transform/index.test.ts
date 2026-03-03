import { describe, test, expect, vi, afterEach } from 'vitest'
import runTransform from './index.js'
import { Pieces } from '@luzzle/core'
import { getStorage } from '../../lib/storage.js'
import { getDatabaseAndMigrate } from '../../lib/database.js'
import runWebMigrations from '../../database/migrations.js'
import { transforms } from '../../lib/transforms/index.js'
import { type Config } from '@luzzle/web.utils'
import { mockKysely } from '../../lib/database.mock.js'

vi.mock('@luzzle/core')
vi.mock('../../lib/storage.js')
vi.mock('../../lib/database.js')
vi.mock('../../database/migrations.js')
vi.mock('../../lib/transforms/index.js', () => ({
	transforms: {
		attachment: { run: vi.fn().mockResolvedValue([]), cleanup: undefined },
		image: { run: vi.fn().mockResolvedValue([]), cleanup: undefined },
		opengraph: { run: vi.fn().mockResolvedValue([]), cleanup: vi.fn().mockResolvedValue(undefined) },
	},
}))

const mocks = {
	Pieces: vi.mocked(Pieces),
	getStorage: vi.mocked(getStorage),
	getDatabaseAndMigrate: vi.mocked(getDatabaseAndMigrate),
	runWebMigrations: vi.mocked(runWebMigrations),
	transforms: vi.mocked(transforms),
}

const config = {
	paths: { database: 'db.sqlite' },
	assets: { salt: 'test-salt' },
} as unknown as Config

const webPiece = {
	id: '1',
	type: 'books',
	file_path: 'book.md',
	json_metadata: '{}',
	slug: 'my-book',
	key: 'key123',
	title: 'My Book',
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
		vi.spyOn(queries, 'executeTakeFirst').mockResolvedValue(webPiece)

		await runTransform({ outDir: '/out', type: 'attachment', file: 'book.md' }, config)

		expect(mocks.transforms.attachment.run).toHaveBeenCalledWith(
			expect.objectContaining({ webPiece, outDir: '/out' })
		)
	})

	test('runs image transform by type', async () => {
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)
		vi.spyOn(queries, 'executeTakeFirst').mockResolvedValue(webPiece)

		await runTransform({ outDir: '/out', type: 'image', file: 'book.md' }, config)

		expect(mocks.transforms.image.run).toHaveBeenCalledOnce()
	})

	test('calls cleanup when transform has one', async () => {
		const { db, queries } = mockKysely()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as ReturnType<typeof getStorage>)
		mocks.Pieces.mockReturnValue({} as Pieces)
		vi.spyOn(queries, 'executeTakeFirst').mockResolvedValue(webPiece)

		await runTransform({ outDir: '/out', type: 'opengraph', file: 'book.md' }, config)

		expect(mocks.transforms.opengraph.cleanup).toHaveBeenCalledOnce()
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

	test('throws if web piece not found', async () => {
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
