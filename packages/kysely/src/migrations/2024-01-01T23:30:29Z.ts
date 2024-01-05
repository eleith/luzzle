import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	// add word count column
	await db.schema.alterTable('links').addColumn('word_count', 'integer').execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	// remove word count column
	await db.schema.alterTable('links').dropColumn('word_count').execute()
}
