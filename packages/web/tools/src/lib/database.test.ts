import { describe, test, expect, vi, afterEach } from 'vitest'
import { getDatabase, getDatabaseAndMigrate } from './database.js'
import { getDatabaseClient, LuzzleDatabase, migrate } from '@luzzle/core'
import path from 'path'
import { Config } from '@luzzle/web.utils'

vi.mock('@luzzle/core')

const mocks = {
	getDatabaseClient: vi.mocked(getDatabaseClient),
	migrate: vi.mocked(migrate),
}

describe('lib/database', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should return database client with resolved path', () => {
		const config = {
			paths: {
				config: '/app/config.yaml',
				database: './data/db.sqlite',
			},
		} as Config
		const expectedDbPath = path.resolve('/app', './data/db.sqlite')
		const mockDb = { withTables: vi.fn().mockReturnThis() } as unknown as LuzzleDatabase
		mocks.getDatabaseClient.mockReturnValue(mockDb)

		const result = getDatabase(config)

		expect(result).toBe(mockDb)
		expect(mocks.getDatabaseClient).toHaveBeenCalledWith(expectedDbPath)
	})

	test('should throw error if config path is missing', () => {
		const config = {
			paths: {
				database: 'db.sqlite',
			},
		} as Config

		expect(() => getDatabase(config)).toThrow('Config path is missing. Database cannot be resolved.')
	})

	test('should get database and migrate successfully', async () => {
		const config = {
			paths: {
				config: '/app/config.yaml',
				database: './data/db.sqlite',
			},
		} as Config
		const mockDb = {} as unknown as LuzzleDatabase
		mocks.getDatabaseClient.mockReturnValue(mockDb)
		mocks.migrate.mockResolvedValue({ error: null })

		const result = await getDatabaseAndMigrate(config)

		expect(result).toBe(mockDb)
		expect(mocks.migrate).toHaveBeenCalledWith(mockDb)
	})

	test('should throw error if migration fails', async () => {
		const config = {
			paths: {
				config: '/app/config.yaml',
				database: './data/db.sqlite',
			},
		} as Config
		const mockDb = {} as unknown as LuzzleDatabase
		mocks.getDatabaseClient.mockReturnValue(mockDb)
		mocks.migrate.mockResolvedValue({ error: 'Migration failed details' })

		await expect(getDatabaseAndMigrate(config)).rejects.toThrow('Migration failed: Migration failed details')
	})
})
