import { describe, expect, test, vi, afterEach } from 'vitest'
import SqliteDatabase from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import { getDatabaseClient } from './database'

vi.mock('better-sqlite3')
vi.mock('kysely')

const mocks = {
  SqliteDatabase: vi.mocked(SqliteDatabase),
  Kysely: vi.mocked(Kysely),
  SqliteDialect: vi.mocked(SqliteDialect),
}

describe('book', () => {
  afterEach(() => {
    vi.resetAllMocks()
    vi.restoreAllMocks()
  })

  test('downloadTo', async () => {
    const path = 'path/to/db.sqlite'

    getDatabaseClient(path)

    expect(mocks.SqliteDatabase).toHaveBeenCalledWith(path)
    expect(mocks.SqliteDialect).toHaveBeenCalledOnce()
    expect(mocks.Kysely).toHaveBeenCalledOnce()
  })
})
