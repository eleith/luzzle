import { describe, expect, test } from 'vitest'
import { sql } from 'kysely'
import { createAppDb } from './client.js'
import { runWebMigrations } from './migrations.js'

describe('web_pieces_date_added_index', () => {
	test('is created by migrating an app db to latest', async () => {
		const db = createAppDb(':memory:')

		await runWebMigrations(db)

		const rows = await sql<{ name: string }>`
			SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'web_pieces_date_added_index'
		`.execute(db)

		expect(rows.rows).toHaveLength(1)
	})
})
