import { getDatabaseClient } from '../src/database/client.js'
import { type LuzzleDatabase } from '../src/database/tables/index.js'
import { sql } from 'kysely'
import migrate from '../src/database/migrations.js'

let cachedDb: LuzzleDatabase | null = null

export async function setupDatabase() {
	if (!cachedDb) {
		cachedDb = getDatabaseClient(':memory:')
		const result = await migrate(cachedDb)
		if (result.error) {
			throw new Error(`Core migration failed: ${result.error}`)
		}
	}
	await sql`BEGIN`.execute(cachedDb)
	return cachedDb
}

export async function teardownDatabase(db: LuzzleDatabase) {
	await sql`ROLLBACK`.execute(db)
}
