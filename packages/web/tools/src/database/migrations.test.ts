import { describe, expect, test, vi, afterEach } from 'vitest'
import { Migrator, FileMigrationProvider } from 'kysely'
import runWebMigrations from './migrations.js'
import { LuzzleDatabase } from '@luzzle/core'

vi.mock('kysely')

const mocks = {
	Migrator: vi.mocked(Migrator),
	FileMigrationProvider: vi.mocked(FileMigrationProvider),
}

describe('database/migrations', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should run web migrations to latest', async () => {
		const db = {} as LuzzleDatabase
		const migrateToLatest = vi.fn().mockResolvedValue({ results: [], error: undefined })

		mocks.FileMigrationProvider.mockReturnValue({} as FileMigrationProvider)
		mocks.Migrator.mockReturnValue({ migrateToLatest } as unknown as Migrator)

		await runWebMigrations(db)

		expect(migrateToLatest).toHaveBeenCalled()
		expect(mocks.FileMigrationProvider).toHaveBeenCalledWith({
			fs: expect.any(Object),
			path: expect.any(Object),
			migrationFolder: expect.any(String),
		})
		expect(mocks.Migrator).toHaveBeenCalledWith(
			expect.objectContaining({
				db,
				migrationTableName: 'kysely_web_migrations',
				migrationLockTableName: 'kysely_web_migrations_lock',
			})
		)
	})
})
