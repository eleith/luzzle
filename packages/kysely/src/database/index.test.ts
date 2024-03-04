import { describe, expect, test, vi, afterEach } from 'vitest'
import SqliteDatabase from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import { getDatabaseClient } from './index.js'

vi.mock('better-sqlite3')
vi.mock('kysely')

const mocks = {
	SqliteDatabase: vi.mocked(SqliteDatabase),
	Kysely: vi.mocked(Kysely),
	SqliteDialect: vi.mocked(SqliteDialect),
}

describe('database', () => {
	afterEach(() => {
		vi.resetAllMocks()
	})

	test('getDatabaseClient', async () => {
		const path = 'path/to/db.sqlite'

		getDatabaseClient(path)

		expect(mocks.SqliteDatabase).toHaveBeenCalledWith(path)
		expect(mocks.SqliteDialect).toHaveBeenCalledOnce()
		expect(mocks.Kysely).toHaveBeenCalledOnce()
	})

	test('getDatabaseClient debug', async () => {
		const path = 'path/to/db.sqlite'

		getDatabaseClient(path, true)

		expect(mocks.SqliteDatabase).toHaveBeenCalledWith(path)
		expect(mocks.SqliteDialect).toHaveBeenCalledOnce()
		expect(mocks.Kysely).toHaveBeenCalledWith({
			log: ['query', 'error'],
			dialect: expect.anything(),
		})
	})
})
