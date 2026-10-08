import type { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('web_pieces').addColumn('last_published_at', 'integer').execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('web_pieces').dropColumn('last_published_at').execute()
}
