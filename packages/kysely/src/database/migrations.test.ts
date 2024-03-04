import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { Migrator, FileMigrationProvider } from 'kysely'
import migrator from './migrations.js'
import { mockKysely } from './database.mock.js'

vi.mock('kysely')

const mocks = {
	migrator: vi.mocked(Migrator),
	fileMigrationProvider: vi.mocked(FileMigrationProvider),
}

const spies: { [key: string]: MockInstance } = {}

describe('src/database/migrations.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('migrator', async () => {
		const { db } = mockKysely()
		const migrateToLatest = vi.fn().mockResolvedValue({})

		mocks.fileMigrationProvider.mockReturnValue({} as FileMigrationProvider)
		mocks.migrator.mockReturnValue({
			migrateToLatest,
		} as unknown as Migrator)

		await migrator(db)

		expect(migrateToLatest).toHaveBeenCalled()
		expect(mocks.fileMigrationProvider).toHaveBeenCalledWith({
			fs: expect.any(Object),
			path: expect.any(Object),
			migrationFolder: expect.any(String),
		})
	})
})
