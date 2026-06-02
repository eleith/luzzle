import { getDatabaseClient } from '@luzzle/core'
import { Kysely, sql } from 'kysely'
import type { WebDatabase } from '../src/services/db.js'

let cachedDb: ReturnType<typeof getDatabaseClient> | null = null

export async function setupDatabase(): Promise<Kysely<WebDatabase>> {
	if (!cachedDb) {
		cachedDb = getDatabaseClient(':memory:')

		await sql`
			CREATE TABLE IF NOT EXISTS pieces_items (
				id TEXT PRIMARY KEY,
				file_path TEXT NOT NULL,
				type TEXT NOT NULL,
				date_added INTEGER NOT NULL,
				date_updated INTEGER,
				note_markdown TEXT,
				frontmatter_json TEXT NOT NULL DEFAULT '{}',
				assets_json_array TEXT
			)
		`.execute(cachedDb)

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
			CREATE TABLE IF NOT EXISTS web_pieces_tags (
				piece_slug TEXT NOT NULL,
				piece_type TEXT NOT NULL,
				piece_id TEXT NOT NULL,
				tag TEXT NOT NULL,
				slug TEXT NOT NULL
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

		await sql`
			CREATE TABLE IF NOT EXISTS job_progress (
				job_id TEXT NOT NULL,
				phase TEXT NOT NULL,
				status TEXT NOT NULL,
				started_at INTEGER NOT NULL,
				finished_at INTEGER,
				message TEXT,
				PRIMARY KEY (job_id, phase)
			)
		`.execute(cachedDb)

		await sql`
			CREATE TABLE IF NOT EXISTS job_progress_logs (
				job_id TEXT NOT NULL,
				phase TEXT NOT NULL,
				line_number INTEGER NOT NULL,
				ts INTEGER NOT NULL,
				level TEXT NOT NULL,
				message TEXT NOT NULL,
				PRIMARY KEY (job_id, phase, line_number)
			)
		`.execute(cachedDb)
	}

	await sql`BEGIN`.execute(cachedDb)
	return cachedDb.withTables<WebDatabase>() as unknown as Kysely<WebDatabase>
}

export async function teardownDatabase<T>(db: Kysely<T>): Promise<void> {
	await sql`ROLLBACK`.execute(db)
}
