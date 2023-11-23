import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	// add the cover column
	await db.schema
		.alterTable('books')
		.renameColumn('cover_path', 'cover')
		.dropColumn('cover_width')
		.dropColumn('cover_height')
		.execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	// add back cover_path, cover_with, cover_height
	await db.schema
		.alterTable('books')
		.renameColumn('cover', 'cover_path')
		.addColumn('cover_width', 'integer')
		.addColumn('cover_height', 'integer')
		.execute()
}
