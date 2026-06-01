import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	// migrate id_ol_book to url
	await db.schema.alterTable('books').addColumn('url', 'text').execute()
	await db
		.updateTable('books')
		.set(({ ref }) => ({
			url: sql`${'https://openlibrary.org/books/'} || ${ref('id_ol_book')}`,
		}))
		.execute()

	// remove id_ol_work column
	await db.schema.alterTable('books').dropColumn('id_ol_book').execute()
	await db.schema.alterTable('books').dropColumn('id_ol_work').execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	// add back id_ol_book, id_ol_work column
	await db.schema.alterTable('books').dropColumn('url').execute()
	await db.schema.alterTable('books').addColumn('id_ol_book', 'text').execute()
	await db.schema.alterTable('books').addColumn('id_ol_work', 'text').execute()
}
