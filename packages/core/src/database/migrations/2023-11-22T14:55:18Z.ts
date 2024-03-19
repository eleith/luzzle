import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	// add the cover column
	await db.schema.alterTable('books').renameColumn('cover_path', 'cover').execute()

	// remove width / height columns
	await db.schema.alterTable('books').dropColumn('cover_width').execute()
	await db.schema.alterTable('books').dropColumn('cover_height').execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	// add back cover_path, cover_with, cover_height
	await db.schema.alterTable('books').renameColumn('cover', 'cover_path').execute()
	await db.schema.alterTable('books').addColumn('cover_width', 'integer').execute()
	await db.schema.alterTable('books').addColumn('cover_height', 'integer').execute()
}
