import { describe, expect, test, vi, afterEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { Kysely } from 'kysely'
import { NodeSqliteDialect } from './NodeSqliteDialect.js'
import { getDatabaseClient } from './client.js'

vi.mock('node:sqlite')
vi.mock('kysely')
vi.mock('./NodeSqliteDialect.js')

const mocks = {
	DatabaseSync: vi.mocked(DatabaseSync),
	Kysely: vi.mocked(Kysely),
	NodeSqliteDialect: vi.mocked(NodeSqliteDialect),
}

describe('database', () => {
	afterEach(() => {
		vi.resetAllMocks()
	})

	test('getDatabaseClient', async () => {
		const path = 'path/to/db.sqlite'

		getDatabaseClient(path)

		expect(mocks.DatabaseSync).toHaveBeenCalledWith(path)
		expect(mocks.NodeSqliteDialect).toHaveBeenCalledOnce()
		expect(mocks.Kysely).toHaveBeenCalledOnce()
	})

	test('getDatabaseClient debug', async () => {
		const path = 'path/to/db.sqlite'

		getDatabaseClient(path, true)

		expect(mocks.DatabaseSync).toHaveBeenCalledWith(path)
		expect(mocks.NodeSqliteDialect).toHaveBeenCalledOnce()
		expect(mocks.Kysely).toHaveBeenCalledWith({
			log: ['query', 'error'],
			dialect: expect.anything(),
		})
	})
})
