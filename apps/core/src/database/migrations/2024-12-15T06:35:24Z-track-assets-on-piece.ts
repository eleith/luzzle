import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('pieces_items').addColumn('assets_json_array', 'text').execute()
	await db.deleteFrom('pieces_items').execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('pieces_items').dropColumn('assets_json_array').execute()
}
