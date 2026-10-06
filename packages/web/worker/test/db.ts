import { readFileSync } from 'node:fs'
import { getDatabaseClient } from '@luzzle/core'
import { sql } from 'kysely'
import type { Kysely } from 'kysely'
import type { WebDatabase } from '../src/services/db.js'

let cachedDb: ReturnType<typeof getDatabaseClient> | null = null

export async function setupDatabase(): Promise<Kysely<WebDatabase>> {
	if (!cachedDb) {
		cachedDb = getDatabaseClient(':memory:')
		const schema = readFileSync(new URL('./db.sql', import.meta.url), 'utf8')
		for (const statement of schema.split('-- statement-breakpoint')) {
			await sql.raw(statement).execute(cachedDb)
		}
	}

	await sql`BEGIN`.execute(cachedDb)
	return cachedDb.withTables<WebDatabase>() as unknown as Kysely<WebDatabase>
}

export async function teardownDatabase<T>(db: Kysely<T>): Promise<void> {
	await sql`ROLLBACK`.execute(db)
}
