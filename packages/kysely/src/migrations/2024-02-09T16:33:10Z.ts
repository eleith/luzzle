import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	const booksQuery = db
		.selectFrom('books')
		.select('id')
		.select('note')
		.select('slug')
		.select('date_added')
		.select('date_updated')
		.select('title')
		.select('keywords')
		.select('cover as media')
		.select('date_read as date_order')
		.select('books as from_piece')

	const linksQuery = db
		.selectFrom('links')
		.select('id')
		.select('note')
		.select('slug')
		.select('date_added')
		.select('date_updated')
		.select('title')
		.select('keywords')
		.select('representative_image as media')
		.select('date_accessed as date_order')
		.select('links as from_piece')

	const unionedQuery = booksQuery.unionAll(linksQuery)

	// add view for all pieces
	await db.schema.createView('pieces_view').as(unionedQuery).execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	// remove the view
	await db.schema.dropView('pieces_view').execute()
}
