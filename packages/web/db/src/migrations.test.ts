import { describe, expect, test, vi, afterEach } from 'vitest'
import { Migrator, type Kysely } from 'kysely'
import { readdirSync } from 'node:fs'
import { runWebMigrations } from './migrations.js'
import { migrations } from './migrations/index.js'

vi.mock('kysely')

const mocks = {
	Migrator: vi.mocked(Migrator)
}

describe('runWebMigrations', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('runs web migrations to latest with the expected table names', async () => {
		const db = {} as Kysely<unknown>
		const migrateToLatest = vi.fn().mockResolvedValue({ results: [], error: undefined })

		mocks.Migrator.mockReturnValue({ migrateToLatest } as unknown as Migrator)

		await runWebMigrations(db)

		expect(migrateToLatest).toHaveBeenCalled()
		expect(mocks.Migrator).toHaveBeenCalledWith(
			expect.objectContaining({
				db,
				provider: expect.objectContaining({ getMigrations: expect.any(Function) }),
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

		mocks.Migrator.mockReturnValue({ migrateToLatest } as unknown as Migrator)

		const got = await runWebMigrations(db)

		expect(got).toBe(resultSet)
	})
})

describe('migrations/index.ts', () => {
	test('every migration file is registered', () => {
		const files = readdirSync(new URL('./migrations', import.meta.url))
			.filter((f) => f.endsWith('.ts') && f !== 'index.ts')
			.map((f) => f.replace('.ts', ''))
			.sort()

		const registered = Object.keys(migrations).sort()

		expect(registered).toEqual(files)
	})
})
