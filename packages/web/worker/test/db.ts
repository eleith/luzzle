import { getDatabaseClient } from '@luzzle/core'
import { Kysely, sql } from 'kysely'
import type { WebDatabase } from '../src/db.js'

let cachedDb: ReturnType<typeof getDatabaseClient> | null = null

export async function setupDatabase(): Promise<Kysely<WebDatabase>> {
	if (!cachedDb) {
		cachedDb = getDatabaseClient(':memory:')

		await sql`
			CREATE TABLE IF NOT EXISTS web_pieces (
				id TEXT PRIMARY KEY,
				key TEXT NOT NULL,
				title TEXT NOT NULL,
				slug TEXT NOT NULL,
				file_path TEXT NOT NULL,
				note TEXT,
				date_updated INTEGER,
				date_added INTEGER NOT NULL,
				date_consumed INTEGER,
				type TEXT NOT NULL,
				json_metadata TEXT NOT NULL DEFAULT '{}',
				summary TEXT,
				keywords TEXT
			)
		`.execute(cachedDb)

		await sql`
			CREATE TABLE IF NOT EXISTS web_pieces_assets (
				piece_file_path TEXT NOT NULL,
				piece_key TEXT NOT NULL,
				piece_asset_path TEXT,
				piece_field_path TEXT,
				asset_key TEXT NOT NULL,
				transformation TEXT NOT NULL,
				asset_path TEXT,
				mime_type TEXT NOT NULL,
				is_embedded INTEGER DEFAULT 0,
				content TEXT
			)
		`.execute(cachedDb)
	}

	await sql`BEGIN`.execute(cachedDb)
	return cachedDb.withTables<WebDatabase>() as unknown as Kysely<WebDatabase>
}

export async function teardownDatabase(db: Kysely<WebDatabase>): Promise<void> {
	await sql`ROLLBACK`.execute(db)
}
