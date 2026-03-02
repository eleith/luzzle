import { describe, test, vi, afterEach, expect } from 'vitest'
import { generateWebSqlite } from './database.js'
import runWebMigrations from '../../database/migrations.js'
import { LuzzleDatabase } from '@luzzle/core'

vi.mock('../../database/migrations.js')

const mocks = {
	runWebMigrations: vi.mocked(runWebMigrations),
}

describe('sqlite/database', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should delegate to runWebMigrations', async () => {
		const mockDb = {} as LuzzleDatabase
		const mockResult = { results: [], error: undefined }
		mocks.runWebMigrations.mockResolvedValue(mockResult)

		const result = await generateWebSqlite(mockDb)

		expect(mocks.runWebMigrations).toHaveBeenCalledWith(mockDb)
		expect(result).toBe(mockResult)
	})
})
