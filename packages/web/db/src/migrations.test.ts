import { describe, expect, test, vi, afterEach } from 'vitest'
import { Migrator, FileMigrationProvider, type Kysely } from 'kysely'
import { runWebMigrations } from './migrations.js'

vi.mock('kysely')

const mocks = {
	Migrator: vi.mocked(Migrator),
	FileMigrationProvider: vi.mocked(FileMigrationProvider)
}

describe('runWebMigrations', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('runs web migrations to latest with the expected table names', async () => {
		const db = {} as Kysely<unknown>
		const migrateToLatest = vi.fn().mockResolvedValue({ results: [], error: undefined })

		mocks.FileMigrationProvider.mockReturnValue({} as FileMigrationProvider)
		mocks.Migrator.mockReturnValue({ migrateToLatest } as unknown as Migrator)

		await runWebMigrations(db)

		expect(migrateToLatest).toHaveBeenCalled()
		expect(mocks.FileMigrationProvider).toHaveBeenCalledWith({
			fs: expect.any(Object),
			path: expect.any(Object),
			migrationFolder: expect.any(String)
		})
		expect(mocks.Migrator).toHaveBeenCalledWith(
			expect.objectContaining({
				db,
				migrationTableName: 'kysely_web_migrations',
				migrationLockTableName: 'kysely_web_migrations_lock'
			})
		)
	})

	test('returns the MigrationResultSet from the migrator', async () => {
		const db = {} as Kysely<unknown>
		const resultSet = {
			results: [{ migrationName: 'foo', direction: 'Up' as const, status: 'Success' as const }]
		}
		const migrateToLatest = vi.fn().mockResolvedValue(resultSet)

		mocks.FileMigrationProvider.mockReturnValue({} as FileMigrationProvider)
		mocks.Migrator.mockReturnValue({ migrateToLatest } as unknown as Migrator)

		const got = await runWebMigrations(db)

		expect(got).toBe(resultSet)
	})
})
