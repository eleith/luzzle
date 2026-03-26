import { describe, expect, test } from 'vitest'
import { getDatabaseClient } from './client.js'
import migrate from './migrations.js'

describe('src/database/migrations.ts', () => {
	test('migrator runs without error on a fresh database', async () => {
		const db = getDatabaseClient(':memory:')
		const result = await migrate(db)

		expect(result.error).toBeUndefined()
		await db.destroy()
	})

	test('migrator is idempotent', async () => {
		const db = getDatabaseClient(':memory:')
		await migrate(db)
		const result = await migrate(db)

		expect(result.error).toBeUndefined()
		await db.destroy()
	})
})
