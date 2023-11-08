import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	// await db.schema
	await db.schema
		.createTable('links')
		.addColumn('id', 'text', (col) => col.primaryKey().notNull())
		.addColumn('slug', 'text', (col) => col.notNull().unique())
		.addColumn('title', 'text', (col) => col.notNull())
		.addColumn('subtitle', 'text')
		.addColumn('author', 'text')
		.addColumn('coauthors', 'text')
		.addColumn('summary', 'text')
		.addColumn('keywords', 'text')
		.addColumn('note', 'text')
		.addColumn('date_accessed', 'datetime', (col) =>
			col.defaultTo(sql`((julianday('now') - 2440587.5)*86400000)`).notNull()
		)
		.addColumn('date_published', 'datetime')
		.addColumn('screenshot_path', 'text')
		.addColumn('date_added', 'datetime', (col) =>
			col.defaultTo(sql`((julianday('now') - 2440587.5)*86400000)`).notNull()
		)
		.addColumn('date_updated', 'datetime')
		.addColumn('archive_path', 'text')
		.addColumn('url', 'text', (col) => col.notNull())
		.addColumn('archive_url', 'text')
		.addColumn('active', 'boolean', (col) => col.notNull().defaultTo(true))
		.addColumn('type', 'text', (col) =>
			col
				.notNull()
				.defaultTo('bookmark')
				.check(sql`type IN ("bookmark", "article")`)
		)
		.execute()
}

export async function down(): Promise<void> {
	// nothing to do
}
