import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('books').ifExists().execute()
	await db.schema.dropTable('texts').ifExists().execute()
	await db.schema.dropTable('games').ifExists().execute()
	await db.schema.dropTable('links').ifExists().execute()

	await db.schema.dropTable('pieces_fts5').ifExists().execute()
	await db.schema.dropTable('pieces').ifExists().execute()

	await db.deleteFrom('pieces_cache').execute()
}

export async function down(): Promise<void> {
	// no down migration, just refer to older migrations for the following tables
	// pieces, pieces_fts5, books, texts, games, links and pieces_cache
}
